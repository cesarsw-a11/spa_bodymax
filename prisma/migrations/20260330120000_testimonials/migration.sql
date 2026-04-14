-- CreateTable
CREATE TABLE `Testimonial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quote` TEXT NOT NULL,
    `quoteEn` TEXT NULL,
    `author` VARCHAR(191) NULL,
    `source` ENUM('GOOGLE', 'INSTAGRAM', 'FACEBOOK') NOT NULL,
    `sourceUrl` VARCHAR(512) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
