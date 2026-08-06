-- Apply after 001_initial_schema.sql.
CREATE TABLE wallet_topups (
    topup_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    external_reference CHAR(36) NOT NULL,
    preference_id VARCHAR(100) NULL,
    provider_payment_id VARCHAR(64) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    provider_payload JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    CONSTRAINT fk_wallet_topup_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT uq_wallet_topup_external_reference UNIQUE (external_reference),
    CONSTRAINT uq_wallet_topup_preference UNIQUE (preference_id),
    CONSTRAINT uq_wallet_topup_provider_payment UNIQUE (provider_payment_id),
    CONSTRAINT chk_wallet_topup_amount_positive CHECK (amount > 0),
    INDEX idx_wallet_topups_user_created (user_id, created_at)
) ENGINE=InnoDB;
