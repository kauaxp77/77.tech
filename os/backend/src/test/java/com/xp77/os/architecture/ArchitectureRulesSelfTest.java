package com.xp77.os.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Prova que as regras pegam violações de verdade, usando as fixtures de archfixtures. */
class ArchitectureRulesSelfTest {

    private static final String ROOT = "archfixtures";
    private static final JavaClasses FIXTURES = new ClassFileImporter().importPackages(ROOT);

    @Test
    void discoversEveryTopLevelModule() {
        assertThat(ArchitectureRules.modulesOf(FIXTURES, ROOT)).containsExactly("alpha", "beta");
    }

    @Test
    void boundaryRuleCatchesCrossModuleEntityUse() {
        assertThatThrownBy(() -> ArchitectureRules.checkModuleBoundaries(FIXTURES, ROOT))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("BetaService");
    }

    @Test
    void identityRuleCatchesOrgIdFromPath() {
        assertThatThrownBy(() -> ArchitectureRules.noControllerAcceptsIdentity().check(FIXTURES))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("'orgId'");
    }

    @Test
    void identityRuleCatchesUserIdInRequestBody() {
        assertThatThrownBy(() -> ArchitectureRules.noControllerAcceptsIdentity().check(FIXTURES))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("'userId'");
    }

    @Test
    void entityRuleLooksInsideGenericReturnTypes() {
        assertThatThrownBy(() -> ArchitectureRules.noControllerReturnsEntity().check(FIXTURES))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("AlphaEntity");
    }
}
