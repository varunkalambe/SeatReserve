package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.*;
import com.seat_reservation_system.srv.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) { this.walletService = walletService; }

    @GetMapping
    public WalletResponse get(Authentication authentication) { return walletService.getWallet(authentication.getName()); }

    @GetMapping("/transactions")
    public List<WalletTransactionResponse> transactions(Authentication authentication) { return walletService.getTransactions(authentication.getName()); }

    @PostMapping("/top-up")
    public WalletResponse topUp(@Valid @RequestBody TopUpRequest request, Authentication authentication) { return walletService.topUp(authentication.getName(), request); }
}
