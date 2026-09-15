package com.localpick.backend.domain.image;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@Service
public class ImageStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif"
    );

    private final Path uploadDir;

    public ImageStorageService(@Value("${localpick.images.upload-dir}") String uploadDir) {
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public ImageUploadResponse store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 이미지가 없습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식입니다.");
        }

        try {
            Files.createDirectories(uploadDir);

            String extension = resolveExtension(file);
            String filename = UUID.randomUUID() + extension;
            Path targetPath = uploadDir.resolve(filename).normalize();

            if (!targetPath.startsWith(uploadDir)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 파일명입니다.");
            }

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String publicUrl = ServletUriComponentsBuilder
                    .fromCurrentContextPath()
                    .path("/uploads/images/")
                    .path(filename)
                    .toUriString();

            return new ImageUploadResponse(publicUrl);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 저장에 실패했습니다.", e);
        }
    }

    private String resolveExtension(MultipartFile file) {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() == null
                ? ""
                : file.getOriginalFilename());
        int dotIndex = originalFilename.lastIndexOf('.');

        if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
            String extension = originalFilename.substring(dotIndex).toLowerCase(Locale.ROOT);

            if (extension.length() <= 8) {
                return extension;
            }
        }

        return switch (String.valueOf(file.getContentType()).toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/heic" -> ".heic";
            case "image/heif" -> ".heif";
            default -> ".jpg";
        };
    }
}
