import { NextResponse } from "next/server";

const DEFAULT_TO_EMAIL = "contato@portaldiretoimoveis.com.br";

function getEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      subject?: string;
      message?: string;
      replyTo?: string;
    };

    const subject = (body.subject ?? "").trim();
    const message = (body.message ?? "").trim();
    const replyTo = (body.replyTo ?? "").trim();

    if (!subject || !message) {
      return NextResponse.json(
        { ok: false, error: "Preencha assunto e mensagem." },
        { status: 400 }
      );
    }

    const resendApiKey = getEnv("RESEND_API_KEY");
    if (!resendApiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Envio de e-mail ainda não configurado no servidor. Defina RESEND_API_KEY na Vercel.",
        },
        { status: 500 }
      );
    }

    const toEmail = getEnv("SUPPORT_TO_EMAIL") || DEFAULT_TO_EMAIL;
    const fromEmail =
      getEnv("SUPPORT_FROM_EMAIL") || "Portal Direto <onboarding@resend.dev>";

    const text = [
      "Nova mensagem da Central de Ajuda",
      "",
      `Assunto: ${subject}`,
      replyTo ? `Resposta para: ${replyTo}` : "Resposta para: não informado",
      "",
      "Mensagem:",
      message,
    ].join("\n");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827;">
        <h2>Nova mensagem da Central de Ajuda</h2>
        <p><strong>Assunto:</strong> ${subject}</p>
        <p><strong>Resposta para:</strong> ${replyTo || "não informado"}</p>
        <p><strong>Mensagem:</strong></p>
        <p style="white-space:pre-wrap;">${message}</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `[Portal Direto] ${subject}`,
        text,
        html,
        reply_to: replyTo || undefined,
      }),
    });

    if (!resendRes.ok) {
      const details = await resendRes.text();
      return NextResponse.json(
        { ok: false, error: `Falha ao enviar e-mail. ${details}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro ao processar envio da mensagem." },
      { status: 500 }
    );
  }
}

