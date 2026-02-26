import nodemailer from 'nodemailer';
import { config } from '../configs/configs.js';

const createTransporter = () => {
    if (!config.smtp.username || !config.smtp.password) {
        console.warn(
            'SMTP credentials not configured. Email functionality will not work.'
        );
        return null;
    }

    return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.enableSsl,
        auth: {
            user: config.smtp.username,
            pass: config.smtp.password,
        },
        connectionTimeout: 10_000,
        greetingTimeout  : 10_000,
        socketTimeout    : 10_000,
        tls: { rejectUnauthorized: false },
    });
};

const transporter = createTransporter();

/* ============================================================
   EMAILS DE AUTENTICACIÓN
   ============================================================ */

export const sendVerificationEmail = async (email, name, verificationToken) => {
    if (!transporter) throw new Error('SMTP transporter not configured');

    const frontendUrl     = config.app.frontendUrl || 'http://localhost:3006/restaurantManagement/v1/';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
        from   : `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
        to     : email,
        subject: 'Verifica tu dirección de correo',
        html   : `
            <h2>¡Bienvenido ${name}!</h2>
            <p>Por favor verifica tu correo haciendo clic en el botón:</p>
            <a href='${verificationUrl}' style='background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;'>
                Verificar Email
            </a>
            <p>Si no puedes hacer clic, copia esta URL en tu navegador:</p>
            <p>${verificationUrl}</p>
            <p>Este enlace expirará en 24 horas.</p>
        `,
    });
};

export const sendPasswordResetEmail = async (email, name, resetToken) => {
    if (!transporter) throw new Error('SMTP transporter not configured');

    const frontendUrl = config.app.frontendUrl || 'http://localhost:3006/restaurantManagement/v1/';
    const resetUrl    = `${frontendUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
        from   : `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
        to     : email,
        subject: 'Restablecer contraseña',
        html   : `
            <h2>Solicitud de restablecimiento de contraseña</h2>
            <p>Hola ${name},</p>
            <p>Solicitaste restablecer tu contraseña. Haz clic en el botón:</p>
            <a href='${resetUrl}' style='background:#dc3545;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;'>
                Restablecer Contraseña
            </a>
            <p>Si no puedes hacer clic, copia esta URL:</p>
            <p>${resetUrl}</p>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste esto, ignora este correo.</p>
        `,
    });
};

export const sendWelcomeEmail = async (email, name) => {
    if (!transporter) throw new Error('SMTP transporter not configured');

    await transporter.sendMail({
        from   : `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
        to     : email,
        subject: '¡Bienvenido a GastroManager!',
        html   : `
            <h2>¡Bienvenido a GastroManager, ${name}!</h2>
            <p>Tu cuenta ha sido verificada y activada correctamente.</p>
            <p>Ya puedes disfrutar de todas las funciones de nuestra plataforma.</p>
        `,
    });
};

export const sendPasswordChangedEmail = async (email, name) => {
    if (!transporter) throw new Error('SMTP transporter not configured');

    await transporter.sendMail({
        from   : `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
        to     : email,
        subject: 'Contraseña actualizada correctamente',
        html   : `
            <h2>Contraseña Actualizada</h2>
            <p>Hola ${name},</p>
            <p>Tu contraseña ha sido actualizada exitosamente.</p>
            <p>Si no realizaste este cambio, contacta a soporte de inmediato.</p>
        `,
    });
};

export const sendRoleRequestEmail = async ({ adminEmail, userName, userEmail, currentRole, requestedRole, requestId }) => {
    if (!transporter) throw new Error('SMTP transporter not configured');

    const frontendUrl = config.app.frontendUrl || 'http://localhost:3006/restaurantManagement/v1';
    const approveUrl  = `${frontendUrl}/auth/role-requests/${requestId}/approve?token=${process.env.ROOT_ADMIN_TOKEN}`;
    const rejectUrl   = `${frontendUrl}/auth/role-requests/${requestId}/reject?token=${process.env.ROOT_ADMIN_TOKEN}`;

    await transporter.sendMail({
        from   : `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to     : adminEmail,
        subject: `Solicitud de Rol: ${currentRole} a ${requestedRole}`,
        html   : `
            <div style="font-family:Arial;max-width:600px;margin:0 auto;border:1px solid #e4e4e4;border-radius:8px;overflow:hidden;">
                <div style="background:#1a237e;color:#fff;padding:20px;text-align:center;">
                    <h1 style="margin:0;font-size:24px;">GastroManager Admin</h1>
                </div>
                <div style="padding:30px;color:#333;line-height:1.6;">
                    <h2 style="color:#1a237e;">Solicitud de Cambio de Rol</h2>
                    <p>Se ha recibido una nueva solicitud de ascenso para el usuario <b>${userName}</b>:</p>
                    <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:20px 0;text-align:center;">
                        <span style="color:#666;font-size:14px;display:block;margin-bottom:5px;">CAMBIO SOLICITADO</span>
                        <span style="font-weight:bold;">${currentRole}</span>
                        <span style="margin:0 15px;color:#1a237e;font-size:20px;">➔</span>
                        <span style="font-weight:bold;color:#1a237e;">${requestedRole}</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                        <tr>
                            <td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold;">Correo:</td>
                            <td style="padding:10px;border-bottom:1px solid #eee;">${userEmail}</td>
                        </tr>
                    </table>
                    <div style="text-align:center;margin-top:30px;">
                        <a href="${approveUrl}" style="background:#2e7d32;color:#fff;padding:12px 25px;text-decoration:none;border-radius:5px;font-weight:bold;margin-right:10px;">Aprobar</a>
                        <a href="${rejectUrl}" style="background:#c62828;color:#fff;padding:12px 25px;text-decoration:none;border-radius:5px;font-weight:bold;">Rechazar</a>
                    </div>
                </div>
            </div>
        `,
    });
};

export const sendRoleUpgradeResponseEmail = async ({ userEmail, userName, requestedRole, status }) => {
    if (!transporter) throw new Error('SMTP transporter not configured');

    const isApproved  = status === 'APPROVED';
    const statusText  = isApproved ? 'Aprobada'  : 'Declinada';
    const statusColor = isApproved ? '#2e7d32' : '#c62828';

    await transporter.sendMail({
        from   : `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to     : userEmail,
        subject: `Resultado de tu solicitud de rol: ${statusText}`,
        html   : `
            <div style="font-family:Arial;max-width:600px;margin:0 auto;border:1px solid #e4e4e4;border-radius:8px;overflow:hidden;">
                <div style="background:#1a237e;color:#fff;padding:20px;text-align:center;">
                    <h1 style="margin:0;font-size:24px;">GastroManager</h1>
                </div>
                <div style="padding:30px;color:#333;line-height:1.6;">
                    <h2 style="color:#1a237e;">Actualización de Solicitud</h2>
                    <p>Hola <b>${userName}</b>,</p>
                    <p>El administrador ha revisado tu solicitud para el rol de <b>${requestedRole}</b>.</p>
                    <div style="background:#f9f9f9;border-left:5px solid ${statusColor};padding:15px;margin:20px 0;">
                        <p style="margin:0;font-weight:bold;color:${statusColor};">Estado: ${statusText}</p>
                    </div>
                    ${isApproved
                        ? '<p>Tus nuevos privilegios han sido activados. Cierra sesión y vuelve a ingresar para aplicar los cambios.</p>'
                        : '<p>Lamentablemente tu solicitud no fue aprobada. Si crees que es un error, contacta a soporte.</p>'}
                </div>
            </div>
        `,
    });
};

/* ============================================================
   EMAILS DE INVENTARIO
   ============================================================ */

export const sendLowStockEmail = async ({
    adminEmail,
    adminName,
    itemName,
    currentStock,
    minStock,
    unit,
    restaurantId,
}) => {
    if (!transporter) {
        console.warn('SMTP no configurado. No se enviará alerta de stock bajo.');
        return;
    }

    await transporter.sendMail({
        from   : `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to     : adminEmail,
        subject: `Alerta de Stock Bajo — ${itemName}`,
        html   : `
            <div style="font-family:Arial;max-width:600px;margin:0 auto;border:1px solid #e4e4e4;border-radius:8px;overflow:hidden;">
                <div style="background:#e65100;color:#fff;padding:20px;text-align:center;">
                    <h1 style="margin:0;font-size:22px;">GastroManager — Alerta de Inventario</h1>
                </div>
                <div style="padding:30px;color:#333;line-height:1.8;">
                    <p>Hola <b>${adminName}</b>,</p>
                    <p>El inventario del restaurante <b>(ID: ${restaurantId})</b> tiene un insumo por debajo del umbral mínimo:</p>

                    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                        <tr style="background:#fff3e0;">
                            <td style="padding:12px;border:1px solid #ffe0b2;font-weight:bold;">Insumo</td>
                            <td style="padding:12px;border:1px solid #ffe0b2;">${itemName}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px;border:1px solid #ffe0b2;font-weight:bold;">Stock Actual</td>
                            <td style="padding:12px;border:1px solid #ffe0b2;color:#c62828;font-weight:bold;">
                                ${currentStock} ${unit}
                            </td>
                        </tr>
                        <tr style="background:#fff3e0;">
                            <td style="padding:12px;border:1px solid #ffe0b2;font-weight:bold;">Stock Mínimo</td>
                            <td style="padding:12px;border:1px solid #ffe0b2;">${minStock} ${unit}</td>
                        </tr>
                    </table>

                    <p>Por favor realiza una reposición a la brevedad para evitar interrupciones en el servicio.</p>
                </div>
                <div style="background:#f5f5f5;color:#777;padding:15px;text-align:center;font-size:12px;">
                    © ${new Date().getFullYear()} GastroManager. Todos los derechos reservados.
                </div>
            </div>
        `,
    });
};

/* ============================================================
   EMAILS DE RESERVACIONES
   ============================================================ */

export const sendReservationConfirmationEmail = async ({
    customerEmail,
    customerName,
    restaurantName,
    tableNumber,
    tableLocation,
    date,
    time,
    guestCount,
    reservationId,
}) => {
    if (!transporter) {
        console.warn('SMTP no configurado. No se enviará confirmación de reserva.');
        return;
    }

    await transporter.sendMail({
        from   : `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to     : customerEmail,
        subject: `Confirmación de Reserva — ${restaurantName}`,
        html   : `
            <div style="font-family:Arial;max-width:600px;margin:0 auto;border:1px solid #e4e4e4;border-radius:8px;overflow:hidden;">
                <div style="background:#1a237e;color:#fff;padding:25px;text-align:center;">
                    <h1 style="margin:0;font-size:24px;">GastroManager</h1>
                    <p style="margin:8px 0 0;font-size:16px;">Confirmación de Reserva</p>
                </div>

                <div style="padding:30px;color:#333;line-height:1.8;">
                    <p>Hola <b>${customerName}</b>, tu reserva ha sido confirmada:</p>

                    <div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:15px;margin:20px 0;border-radius:0 5px 5px 0;">
                        <p style="margin:0;font-size:16px;font-weight:bold;color:#2e7d32;">Reserva Confirmada</p>
                    </div>

                    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                        <tr style="background:#f5f5f5;">
                            <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;">Restaurante</td>
                            <td style="padding:12px;border:1px solid #e0e0e0;">${restaurantName}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;">Fecha</td>
                            <td style="padding:12px;border:1px solid #e0e0e0;">${date}</td>
                        </tr>
                        <tr style="background:#f5f5f5;">
                            <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;">Hora</td>
                            <td style="padding:12px;border:1px solid #e0e0e0;">${time}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;">Mesa</td>
                            <td style="padding:12px;border:1px solid #e0e0e0;">
                                #${tableNumber}${tableLocation ? ` — ${tableLocation}` : ''}
                            </td>
                        </tr>
                        ${guestCount ? `
                        <tr style="background:#f5f5f5;">
                            <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;">Comensales</td>
                            <td style="padding:12px;border:1px solid #e0e0e0;">${guestCount}</td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;">ID Reserva</td>
                            <td style="padding:12px;border:1px solid #e0e0e0;font-size:12px;color:#666;">${reservationId}</td>
                        </tr>
                    </table>

                    <p>Si necesitas cancelar o modificar tu reserva, comunícate directamente con el restaurante.</p>
                    <p>¡Te esperamos!</p>
                </div>

                <div style="background:#f5f5f5;color:#777;padding:15px;text-align:center;font-size:12px;">
                    © ${new Date().getFullYear()} GastroManager. Todos los derechos reservados.
                </div>
            </div>
        `,
    });
};

/* ============================================================
   EMAILS DE FACTURACIÓN
   ============================================================ */

export const sendInvoiceEmail = async ({
    customerEmail,
    customerName,
    invoiceNumber,
    date,
    restaurantName,
    tableNumber,
    items,
    total,
}) => {
    if (!transporter) {
        console.warn('SMTP no configurado. No se enviará comprobante de consumo.');
        return;
    }

    const itemRows = items.map(item => `
        <tr>
            <td style="padding:10px;border:1px solid #e0e0e0;">${item.name}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center;">${item.quantity}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:right;">$${item.price.toFixed(2)}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:right;">$${item.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');

    await transporter.sendMail({
        from   : `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to     : customerEmail,
        subject: `Comprobante de consumo #${invoiceNumber} — ${restaurantName}`,
        html   : `
            <div style="font-family:Arial;max-width:600px;margin:0 auto;border:1px solid #e4e4e4;border-radius:8px;overflow:hidden;">
                <div style="background:#1a237e;color:#fff;padding:25px;text-align:center;">
                    <h1 style="margin:0;font-size:24px;">GastroManager</h1>
                    <p style="margin:8px 0 0;font-size:16px;">Comprobante de Consumo</p>
                </div>

                <div style="padding:30px;color:#333;line-height:1.8;">
                    <p>Hola <b>${customerName}</b>, gracias por tu visita. Aquí está tu comprobante:</p>

                    <table style="width:100%;border-collapse:collapse;margin:10px 0 20px;">
                        <tr style="background:#f5f5f5;">
                            <td style="padding:10px;border:1px solid #e0e0e0;font-weight:bold;">N° Comprobante</td>
                            <td style="padding:10px;border:1px solid #e0e0e0;">#${invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px;border:1px solid #e0e0e0;font-weight:bold;">Fecha</td>
                            <td style="padding:10px;border:1px solid #e0e0e0;">${date}</td>
                        </tr>
                        <tr style="background:#f5f5f5;">
                            <td style="padding:10px;border:1px solid #e0e0e0;font-weight:bold;">Restaurante</td>
                            <td style="padding:10px;border:1px solid #e0e0e0;">${restaurantName}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px;border:1px solid #e0e0e0;font-weight:bold;">Mesa</td>
                            <td style="padding:10px;border:1px solid #e0e0e0;">#${tableNumber}</td>
                        </tr>
                    </table>

                    <h3 style="color:#1a237e;margin-bottom:8px;">Detalle del consumo</h3>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                        <thead>
                            <tr style="background:#1a237e;color:#fff;">
                                <th style="padding:10px;text-align:left;">Producto</th>
                                <th style="padding:10px;text-align:center;">Cant.</th>
                                <th style="padding:10px;text-align:right;">Precio</th>
                                <th style="padding:10px;text-align:right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${itemRows}</tbody>
                        <tfoot>
                            <tr style="background:#e8f5e9;">
                                <td colspan="3" style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;text-align:right;">TOTAL</td>
                                <td style="padding:12px;border:1px solid #e0e0e0;font-weight:bold;text-align:right;color:#2e7d32;">$${total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:12px;border-radius:0 5px 5px 0;">
                        <p style="margin:0;font-weight:bold;color:#2e7d32;">Estado: PAGADO ✓</p>
                    </div>
                </div>

                <div style="background:#f5f5f5;color:#777;padding:15px;text-align:center;font-size:12px;">
                    © ${new Date().getFullYear()} GastroManager. Todos los derechos reservados.
                </div>
            </div>
        `,
    });
};