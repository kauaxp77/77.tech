package com.xp77.os.architecture;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Regras de arquitetura, parametrizadas pelo pacote raiz para poderem ser provadas
 * contra as fixtures (archfixtures) e aplicadas ao código real (com.xp77.os).
 */
final class ArchitectureRules {

    private static final Set<String> IDENTITY_NAMES = Set.of(
            "userid", "user_id", "orgid", "org_id", "organizationid", "organization_id");

    private ArchitectureRules() {
    }

    /** Módulos = pacotes de primeiro nível abaixo da raiz. Nada de lista fixa. */
    static Set<String> modulesOf(JavaClasses classes, String rootPackage) {
        String prefix = rootPackage + ".";
        Set<String> modules = new TreeSet<>();
        for (JavaClass javaClass : classes) {
            String packageName = javaClass.getPackageName();
            if (packageName.startsWith(prefix)) {
                modules.add(packageName.substring(prefix.length()).split("\\.")[0]);
            }
        }
        return modules;
    }

    /** Regra 1: ninguém de fora de um módulo usa o entity/ ou o repository/ dele. */
    static void checkModuleBoundaries(JavaClasses classes, String rootPackage) {
        for (String module : modulesOf(classes, rootPackage)) {
            String base = rootPackage + "." + module;
            noClasses().that().resideOutsideOfPackage(base + "..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(base + ".entity..", base + ".repository..")
                    .because("módulos só conversam pelo pacote api/ do outro módulo")
                    .allowEmptyShould(true)
                    .check(classes);
        }
    }

    /** Regra 2: identidade e organização vêm só do token, nunca de parâmetro ou corpo. */
    static ArchRule noControllerAcceptsIdentity() {
        return noClasses().that().areAnnotatedWith(RestController.class)
                .should(acceptIdentityFromClient())
                .because("identidade e organização vêm só de @AuthenticationPrincipal")
                .allowEmptyShould(true);
    }

    /** Regra 3: nenhum controller devolve @Entity, nem dentro de um tipo genérico. */
    static ArchRule noControllerReturnsEntity() {
        return noClasses().that().areAnnotatedWith(RestController.class)
                .should(returnAnEntity())
                .because("controllers devolvem DTO, nunca @Entity")
                .allowEmptyShould(true);
    }

    private static boolean isIdentity(String name) {
        return name != null
                && IDENTITY_NAMES.contains(name.toLowerCase(Locale.ROOT).replace("-", "_"));
    }

    /**
     * {@code @PathVariable UUID orgId} não declara nome na anotação: o nome real só existe
     * no bytecode (flag -parameters, ligada pelo spring-boot-starter-parent).
     */
    private static String realParameterName(JavaMethod method, int index) {
        try {
            java.lang.reflect.Parameter[] parameters = method.reflect().getParameters();
            return index < parameters.length ? parameters[index].getName() : null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static ArchCondition<JavaClass> acceptIdentityFromClient() {
        return new ArchCondition<>("aceitar userId ou orgId vindo do cliente") {
            @Override
            public void check(JavaClass controller, ConditionEvents events) {
                for (JavaMethod method : controller.getMethods()) {
                    method.getParameters().forEach(parameter -> {
                        String name = null;
                        if (parameter.isAnnotatedWith(PathVariable.class)) {
                            PathVariable annotation = parameter.getAnnotationOfType(PathVariable.class);
                            name = !annotation.value().isEmpty() ? annotation.value() : annotation.name();
                        } else if (parameter.isAnnotatedWith(RequestParam.class)) {
                            RequestParam annotation = parameter.getAnnotationOfType(RequestParam.class);
                            name = !annotation.value().isEmpty() ? annotation.value() : annotation.name();
                        }
                        if (name != null && name.isEmpty()) {
                            name = realParameterName(method, parameter.getIndex());
                        }
                        if (isIdentity(name)) {
                            events.add(SimpleConditionEvent.satisfied(controller,
                                    method.getFullName() + " aceita '" + name + "' do cliente"));
                        }
                        if (parameter.isAnnotatedWith(RequestBody.class)) {
                            JavaClass body = parameter.getRawType();
                            body.getAllFields().forEach(field -> {
                                if (isIdentity(field.getName())) {
                                    events.add(SimpleConditionEvent.satisfied(controller,
                                            method.getFullName() + " aceita '" + field.getName()
                                                    + "' do cliente via @RequestBody em " + body.getName()));
                                }
                            });
                        }
                    });
                }
            }
        };
    }

    private static ArchCondition<JavaClass> returnAnEntity() {
        return new ArchCondition<>("devolver @Entity") {
            @Override
            public void check(JavaClass controller, ConditionEvents events) {
                for (JavaMethod method : controller.getMethods()) {
                    // Lambdas viram métodos sintéticos "lambda$N": não são respostas de endpoint.
                    if (method.getName().startsWith("lambda$")) {
                        continue;
                    }
                    for (JavaClass involved : method.getReturnType().getAllInvolvedRawTypes()) {
                        if (involved.isAnnotatedWith(Entity.class)) {
                            events.add(SimpleConditionEvent.satisfied(controller,
                                    method.getFullName() + " devolve a entidade " + involved.getName()));
                        }
                    }
                }
            }
        };
    }
}
