package com.xp77.os.catalog;

import com.xp77.os.catalog.entity.PriceItem;
import com.xp77.os.catalog.repository.PriceItemRepository;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Preço é informação comercial sensível: a tabela de uma organização não pode aparecer
 * para outra. Quem garante isso é o banco (RLS), não um WHERE que alguém pode esquecer.
 */
class PriceCatalogIsolationTest extends PostgresTestBase {

    @Autowired
    private PriceItemRepository items;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private UUID orgA;
    private UUID orgB;

    @BeforeEach
    void twoOrganizationsWithTheirOwnPrices() {
        OrgContext.clear();
        orgA = TestData.createOrg("Org A");
        orgB = TestData.createOrg("Org B");

        inOrg(orgA, () -> items.saveAndFlush(
                new PriceItem(orgA, PriceItem.Kind.BASE, "Site da A", 500_00L, 4, 1)));
        inOrg(orgB, () -> items.saveAndFlush(
                new PriceItem(orgB, PriceItem.Kind.BASE, "Site da B", 900_00L, 6, 1)));
    }

    private <T> T inOrg(UUID org, TransactionCallback<T> work) {
        return OrgContext.callAs(org, () -> new TransactionTemplate(transactionManager).execute(work));
    }

    private void inOrg(UUID org, Runnable work) {
        inOrg(org, status -> {
            work.run();
            return null;
        });
    }

    @Test
    void aOrganizacaoSoEnxergaOsProprioPrecos() {
        List<PriceItem> daA = inOrg(orgA, status -> items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc());
        List<PriceItem> daB = inOrg(orgB, status -> items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc());

        assertThat(daA).extracting(PriceItem::getName).containsExactly("Site da A");
        assertThat(daB).extracting(PriceItem::getName).containsExactly("Site da B");
    }

    @Test
    void semOrganizacaoNoContextoNadaAparece() {
        TransactionTemplate semOrg = new TransactionTemplate(transactionManager);
        List<PriceItem> nenhum = semOrg.execute(
                status -> items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc());

        assertThat(nenhum).isEmpty();
    }

    @Test
    void gravarPrecoDeOutraOrganizacaoERecusadoPeloBanco() {
        // Mesmo escrevendo o org_id da outra na mão, o WITH CHECK do RLS recusa.
        // A exceção vem como InvalidDataAccessResourceUsageException, não como violação
        // de integridade: para o PostgreSQL, a linha não fere restrição nenhuma — ela
        // simplesmente não pode existir sob esta política.
        assertThatThrownBy(() -> inOrg(orgA, () -> items.saveAndFlush(
                new PriceItem(orgB, PriceItem.Kind.EXTRA, "Invasor", 100_00L, 1, 9))))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("row-level security");
    }

    @Test
    void precoNaoSeApaga_soSeArquiva() {
        // A permissão de DELETE foi retirada na migração: uma proposta antiga precisa
        // continuar explicável, e "esse item não existe mais" não explica nada.
        UUID id = inOrg(orgA, status ->
                items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc().getFirst().getId());

        assertThatThrownBy(() -> inOrg(orgA, () -> {
            items.deleteById(id);
            items.flush();
        })).isInstanceOf(Exception.class);

        Optional<PriceItem> aindaLa = inOrg(orgA, status -> items.findById(id));
        assertThat(aindaLa).isPresent();
    }

    @Test
    void arquivarTiraDaListaSemPerderOItem() {
        inOrg(orgA, () -> {
            PriceItem item = items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc().getFirst();
            item.archive();
            items.saveAndFlush(item);
        });

        List<PriceItem> ativos = inOrg(orgA, status -> items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc());
        List<PriceItem> todos = inOrg(orgA, status -> items.findAllByOrderByKindAscSortOrderAscNameAsc());

        assertThat(ativos).isEmpty();
        assertThat(todos).hasSize(1);
    }

    @Test
    void doisItensAtivosComOMesmoNomeNoMesmoGrupoSaoRecusados() {
        assertThatThrownBy(() -> inOrg(orgA, () -> items.saveAndFlush(
                new PriceItem(orgA, PriceItem.Kind.BASE, "Site da A", 700_00L, 5, 2))))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void oNomeDeUmItemArquivadoPodeSerReusado() {
        // O índice é parcial (WHERE active): arquivar libera o nome de volta.
        inOrg(orgA, () -> {
            PriceItem item = items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc().getFirst();
            item.archive();
            items.saveAndFlush(item);
        });

        inOrg(orgA, () -> items.saveAndFlush(
                new PriceItem(orgA, PriceItem.Kind.BASE, "Site da A", 700_00L, 5, 2)));

        List<PriceItem> depois = inOrg(orgA, status -> items.findByActiveTrueOrderByKindAscSortOrderAscNameAsc());
        assertThat(depois).extracting(PriceItem::getPriceCents).containsExactly(700_00L);
    }

    @Test
    void precoNegativoERecusado() {
        assertThatThrownBy(() -> inOrg(orgA, () -> items.saveAndFlush(
                new PriceItem(orgA, PriceItem.Kind.EXTRA, "Negativo", -1L, 1, 9))))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
