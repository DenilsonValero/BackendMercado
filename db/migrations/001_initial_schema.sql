-- MySQL 8+. Apply this to an empty database before running the API.
CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_balance_nonnegative CHECK (wallet_balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE items (
    item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    rarity VARCHAR(30) NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_items_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE user_inventory (
    inventory_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_inventory_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    INDEX idx_inventory_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE market_listings (
    listing_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inventory_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    status ENUM('active', 'sold', 'cancelled') NOT NULL DEFAULT 'active',
    listed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    -- MySQL has no partial unique index. This permits history but only one active listing per item.
    active_inventory_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN inventory_id ELSE NULL END) STORED,
    CONSTRAINT fk_listing_inventory FOREIGN KEY (inventory_id) REFERENCES user_inventory(inventory_id),
    CONSTRAINT fk_listing_seller FOREIGN KEY (seller_id) REFERENCES users(user_id),
    CONSTRAINT uq_active_inventory UNIQUE (active_inventory_id),
    CONSTRAINT chk_listing_price_positive CHECK (price > 0),
    INDEX idx_listing_status_listed (status, listed_at)
) ENGINE=InnoDB;

CREATE TABLE transactions (
    transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    listing_id BIGINT UNSIGNED NOT NULL,
    buyer_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_listing FOREIGN KEY (listing_id) REFERENCES market_listings(listing_id),
    CONSTRAINT fk_transaction_buyer FOREIGN KEY (buyer_id) REFERENCES users(user_id),
    CONSTRAINT fk_transaction_seller FOREIGN KEY (seller_id) REFERENCES users(user_id),
    CONSTRAINT uq_transaction_listing UNIQUE (listing_id),
    CONSTRAINT chk_transaction_amount_positive CHECK (amount > 0),
    INDEX idx_transaction_buyer_created (buyer_id, created_at),
    INDEX idx_transaction_seller_created (seller_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE wallet_ledger (
    ledger_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    reference_type VARCHAR(30) NOT NULL,
    reference_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT chk_ledger_amount_positive CHECK (amount > 0),
    INDEX idx_ledger_user_created (user_id, created_at)
) ENGINE=InnoDB;
