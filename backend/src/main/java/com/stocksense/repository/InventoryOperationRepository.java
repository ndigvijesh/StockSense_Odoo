package com.stocksense.repository;

import com.stocksense.domain.InventoryOperation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryOperationRepository extends JpaRepository<InventoryOperation, Long> {
    List<InventoryOperation> findAllByOrderByCreatedAtDesc();
    long countByTypeAndStatusNot(String type, String status);
}