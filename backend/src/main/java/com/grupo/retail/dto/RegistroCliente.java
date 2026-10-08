package com.grupo.retail.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistroCliente(
                @NotBlank(message = "El nombre es obligatorio") @Size(max = 120, message = "El nombre no puede superar 120 caracteres") String nombre,

                @NotBlank(message = "El correo es obligatorio") @Email(message = "El correo no tiene un formato válido") @Size(max = 180, message = "El correo no puede superar 180 caracteres") String correo,

                @NotBlank(message = "La contraseña es obligatoria") @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres") String clave) {
}