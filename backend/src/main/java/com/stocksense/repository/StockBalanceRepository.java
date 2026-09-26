package com.stocksense.repository;

import com.stocksense.domain.StockBalance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StockBalanceRepository extends JpaRepository<StockBalance, Long> {
    Optional<StockBalance> findByProductIdAndWarehouseIdAndLocation(Long productId, Long warehouseId, String location);
    List<StockBalance> findByProductId(Long productId);
    @Query("select coalesce(sum(b.quantity), 0) from StockBalance b")
    double totalUnits();
}