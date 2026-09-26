package com.stocksense.repository;

import com.stocksense.domain.StockMovement;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findTop100ByOrderByOccurredAtDesc();
}