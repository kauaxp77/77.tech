package archfixtures.beta.controller;

import archfixtures.alpha.entity.AlphaEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Fixture do ArchUnit: controller que viola as regras de identidade e de entidade. */
@RestController
public class BadController {

    @GetMapping("/fixture/{orgId}")
    public ResponseEntity<AlphaEntity> byOrg(@PathVariable UUID orgId) {
        return ResponseEntity.ok(new AlphaEntity());
    }

    @PostMapping("/fixture")
    public void create(@RequestBody Payload payload) {
    }

    public record Payload(UUID userId, String name) {
    }
}
