-- Canvas 27 — MySQL (basado en Archivos/)
CREATE DATABASE IF NOT EXISTS canvas27 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE canvas27;

CREATE TABLE IF NOT EXISTS artists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temp_name VARCHAR(100) NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NULL,
    bio TEXT NULL,
    avatar_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT NOT NULL,
    title VARCHAR(120) NULL,
    file_path VARCHAR(500) NOT NULL,
    latitude VARCHAR(32) NULL,
    longitude VARCHAR(32) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_photos_artist FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
    INDEX idx_photos_artist (artist_id)
) ENGINE=InnoDB;
