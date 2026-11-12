package com.grupo.retail.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistroPersonal(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        String nombre,
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 180, message = "El correo no puede superar 180 caracteres")
        String correo,
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        @Pattern(regexp = ReglasClave.PATRON, message = ReglasClave.MENSAJE)
        String clave,
        @NotBlank(message = "El rol es obligatorio")
        @Pattern(regexp = "ADMIN|VENDEDOR|ALMACEN|SOPORTE|CLIENTE",
                message = "El rol debe ser ADMIN, VENDEDOR, ALMACEN, SOPORTE o CLIENTE")
        String rol) {
}