import nodemailer from "nodemailer";
import fs from "fs";

type SendReportEmailArgs = {
  to: string[];
  subject: string;
  html: string;
  attachmentPath: string;
  attachmentName?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.vortexhub.com.br";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE || "true").toLowerCase() === "true";

  const user = process.env.SMTP_USER || "contato@vortexhub.com.br";
  const pass = process.env.SMTP_PASS || "78124770";

  const fromName = process.env.SMTP_FROM_NAME || "VortexHub";
  const from = `"${fromName}" <${user}>`;

  return { host, port, secure, auth: { user, pass }, from };
}

export async function sendReportEmail({
  to,
  subject,
  html,
  attachmentPath,
  attachmentName = "relatorio.pdf",
}: SendReportEmailArgs) {
  if (!to?.length) throw new Error("Nenhum destinatário informado (to vazio).");

  const smtp = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  // Opcional mas bom: valida credenciais e conexão
  await transporter.verify();

  const info = await transporter.sendMail({
    from: smtp.from,
    to: to.join(","),
    subject,
    html,
    attachments: [
      {
        filename: attachmentName,
        content: fs.createReadStream(attachmentPath),
        contentType: "application/pdf",
      },
    ],
  });

  return
// @ts-ignore
  return info;
}
