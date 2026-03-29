-- Campos opcionales en inglés + description principal como TEXT (textos largos)
ALTER TABLE `Service` ADD COLUMN `nameEn` VARCHAR(191) NULL,
    ADD COLUMN `descriptionEn` TEXT NULL;

ALTER TABLE `Service` MODIFY `description` TEXT NOT NULL;
