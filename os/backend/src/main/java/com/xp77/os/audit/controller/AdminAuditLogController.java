package com.xp77.os.audit.controller;

import com.xp77.os.audit.dto.AuditLogResponse;
import com.xp77.os.audit.entity.AuditLog;
import com.xp77.os.audit.repository.AuditLogRepository;
import com.xp77.os.shared.pagination.PageRequestFactory;
import com.xp77.os.shared.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

/** Auditoria é só leitura: não existe escrita aqui. O RLS limita à organização do token. */
@RestController
@RequestMapping("/admin/audit-logs")
public class AdminAuditLogController {

    private final AuditLogRepository logs;

    public AdminAuditLogController(AuditLogRepository logs) {
        this.logs = logs;
    }

    /**
     * A transação é obrigatória, não um detalhe: é no início dela que o
     * OrgAwareJpaTransactionManager informa app.org_id ao banco. Sem ela, uma consulta
     * derivada do Spring Data (que, ao contrário de findAll, não é transacional por
     * conta própria) rodaria fora de transação e o RLS devolveria uma lista vazia.
     *
     * @param action uma ação, ou várias separadas por vírgula.
     */
    @Transactional(readOnly = true)
    @GetMapping
    public ResponseEntity<PageResponse<AuditLogResponse>> list(
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {

        Pageable base = PageRequestFactory.of(page, size, null);
        Pageable paging = PageRequest.of(base.getPageNumber(), base.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<String> actions = action == null ? List.of() : Arrays.stream(action.split(","))
                .map(String::trim).filter(value -> !value.isEmpty()).toList();

        Page<AuditLog> found = actions.isEmpty() ? logs.findAll(paging) : logs.findByActionIn(actions, paging);
        return ResponseEntity.ok(PageResponse.from(found.map(AuditLogResponse::from)));
    }
}
