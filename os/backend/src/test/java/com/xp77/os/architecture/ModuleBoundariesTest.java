package com.xp77.os.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** As três regras aplicadas ao código de produção. Módulo novo entra sozinho na checagem. */
class ModuleBoundariesTest {

    private static final String ROOT = "com.xp77.os";
    private static JavaClasses production;

    @BeforeAll
    static void importProductionClasses() {
        production = new ClassFileImporter()
                .withImportOption(new ImportOption.DoNotIncludeTests())
                .importPackages(ROOT);
    }

    @Test
    void modulesAreDiscoveredFromTopLevelPackages() {
        assertThat(ArchitectureRules.modulesOf(production, ROOT)).contains("shared");
    }

    @Test
    void noModuleUsesAnotherModulesEntityOrRepository() {
        ArchitectureRules.checkModuleBoundaries(production, ROOT);
    }

    @Test
    void noControllerAcceptsUserIdOrOrgIdFromTheClient() {
        ArchitectureRules.noControllerAcceptsIdentity().check(production);
    }

    @Test
    void noControllerReturnsAnEntity() {
        ArchitectureRules.noControllerReturnsEntity().check(production);
    }
}
