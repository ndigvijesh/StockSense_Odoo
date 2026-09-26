package com.stocksense.config;

import com.stocksense.domain.Product;
import com.stocksense.domain.StockBalance;
import com.stocksense.domain.Warehouse;
import com.stocksense.repository.ProductRepository;
import com.stocksense.repository.StockBalanceRepository;
import com.stocksense.repository.UserAccountRepository;
import com.stocksense.repository.WarehouseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DemoData {
    @Bean
    CommandLineRunner seedData(ProductRepository products, WarehouseRepository warehouses, StockBalanceRepository balances,
                               UserAccountRepository users, PasswordEncoder passwords) {
        return args -> {
            if (warehouses.count() == 0) {
                warehouses.save(new Warehouse("Main warehouse", "MAIN", "Central distribution"));
                warehouses.save(new Warehouse("North warehouse", "NORTH", "North district"));
                warehouses.save(new Warehouse("Production floor", "PROD", "Manufacturing"));
            }
            if (products.count() == 0) {
                Warehouse main = warehouses.findAll().get(0);
                Product steel = products.save(new Product("Steel rod · 12 mm", "STL-012-CR", "Raw materials", "kg", 300));
                Product plywood = products.save(new Product("Plywood sheet · 18 mm", "PLY-018-BR", "Raw materials", "sheets", 100));
                Product chair = products.save(new Product("Ergo office chair", "FUR-CHR-04", "Finished goods", "units", 20));
                Product bolts = products.save(new Product("M8 hex bolt · zinc", "FST-BLT-M8", "Components", "boxes", 24));
                Product aluminium = products.save(new Product("Aluminium angle · 2 m", "ALU-ANG-2M", "Raw materials", "units", 80));
                Product frame = products.save(new Product("Desk frame · black", "FUR-FRM-BK", "Finished goods", "units", 15));
                balances.save(new StockBalance(steel, main, "Main / A-01", 1240));
                balances.save(new StockBalance(plywood, main, "Main / B-14", 86));
                balances.save(new StockBalance(chair, warehouses.findAll().get(1), "North / C-02", 42));
                balances.save(new StockBalance(bolts, main, "Main / D-08", 12));
                balances.save(new StockBalance(aluminium, main, "Main / A-06", 328));
                balances.save(new StockBalance(frame, warehouses.findAll().get(1), "North / C-05", 0));
            }
            if (!users.existsByEmailIgnoreCase("manager@stocksense.app")) {
                users.save(new com.stocksense.domain.UserAccount("Olivia Rhye", "manager@stocksense.app", passwords.encode("stock1234")));
            }
        };
    }
}