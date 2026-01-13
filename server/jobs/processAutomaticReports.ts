import { supabase, supabaseClient as supabaseServer  } from "../supabase"; // ajuste o path
import { throwIfError } from "../utils/throwIfError";
import { sendReportEmail } from "../utils/mailer";
import { generateFullReportPDF } from "../helper/generateFullReportPDF";
import { getRangeByFrequency, computeNextGeneration } from "../utils/date";

const LEADS_DATE_COL = "criado_em";
const LOST_STATUS_ID = 143;

export async function processAutomaticReports() {
  const nowISO = new Date().toISOString();

  // pega tudo que está vencido e ativo
  const { data: reports, error } = await supabaseServer
    .from("automatic_reports")
    .select("*")
    .lte("next_generation", nowISO)

  throwIfError("load_due_reports", error);

  if (!reports || reports.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;

  for (const report of reports) {
    try {
      if (report.report_type !== "full") continue;

      const companyId = report.company_id as string;

      // Período do relatório baseado na frequency
      const { start, end } = getRangeByFrequency(report.frequency);
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      const recipients: string[] = Array.isArray(report.email_recipients)
        ? report.email_recipients.filter((e: any) => typeof e === "string" && e.includes("@"))
        : [];

      // Corretores
      const { data: brokers, error: brokersError } = await supabaseServer
        .from("brokers")
        .select("id, nome")
        .eq("cargo", "Corretor")
        .eq("company_id", companyId);

      throwIfError("load_brokers", brokersError);

      const rows: any[] = [];
      const startUnix = Math.floor(start.getTime() / 1000);
      const endUnix = Math.floor(end.getTime() / 1000);

      for (const broker of brokers ?? []) {
        // leads
        const { data: leadIdsData, error: leadIdsError } = await supabaseServer
          .from("leads")
          .select("id")
          .eq("company_id", companyId)
          .eq("responsavel_id", broker.id)
          .gte(LEADS_DATE_COL as any, startISO)
          .lte(LEADS_DATE_COL as any, endISO);

        throwIfError(`lead_ids(${broker.id})`, leadIdsError);

        const leadIds = (leadIdsData ?? []).map((x: any) => x.id);
        const leads = leadIds.length;

        // repiques (direto por responsavel_id)
        const { count: repCount, error: repError } = await supabaseServer
          .from("leads_com_repique")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("responsavel_id", broker.id)
          .gte("data_repique_unix" as any, startUnix)
          .lte("data_repique_unix" as any, endUnix);

        throwIfError(`repiques(${broker.id})`, repError);

        const repiques = repCount ?? 0;

        // perdidos
        const { count: lostCount, error: lostError } = await supabaseServer
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("responsavel_id", broker.id)
          .eq("status_id", LOST_STATUS_ID)
          .gte(LEADS_DATE_COL as any, startISO)
          .lte(LEADS_DATE_COL as any, endISO);

        throwIfError(`perdidos(${broker.id})`, lostError);

        const perdidos = lostCount ?? 0;
        const total = leads + repiques;
        const soma = total + perdidos;

        rows.push({
          corretor: broker.nome ?? String(broker.id),
          leads,
          repiques,
          total,
          perdidos,
          soma,
        });
      }

      // TOTAL
      const totals = rows.reduce(
        (acc, r) => {
          acc.leads += r.leads;
          acc.repiques += r.repiques;
          acc.total += r.total;
          acc.perdidos += r.perdidos;
          acc.soma += r.soma;
          return acc;
        },
        { leads: 0, repiques: 0, total: 0, perdidos: 0, soma: 0 }
      );

      rows.push({ corretor: "TOTAL", ...totals });

      const periodLabel = `${formatBR(start)} a ${formatBR(end)}`;
      const pdfTitle = `RELATÓRIO ${periodLabel}`;
      const pdfPath = await generateFullReportPDF(rows, pdfTitle);

      // Email
      if (recipients.length > 0) {
        await sendReportEmail({
          to: recipients,
          subject: `Relatório ${report.name} (${periodLabel})`,
          html: `<p>Segue em anexo o relatório <b>${report.name}</b> do período <b>${periodLabel}</b>.</p>`,
          attachmentPath: pdfPath,
          attachmentName: `relatorio-${report.name}-${report.frequency}-${start.getFullYear()}-${String(
            start.getMonth() + 1
          ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}.pdf`,
        });
      }

      // Calcula próximo next_generation (baseado no valor atual, se existir, senão "agora")
      const prevNext = report.next_generation ? new Date(report.next_generation) : new Date();
      const newNext = computeNextGeneration(prevNext, report.frequency);

      // Atualiza report
      const { error: updErr } = await supabaseServer
        .from("automatic_reports")
        .update({
          last_generated: new Date().toISOString(),
          next_generation: newNext.toISOString(),
        })
        .eq("id", report.id)
        .eq("company_id", companyId);

      throwIfError("update_report_schedule", updErr);

      // Notificação (opcional)
      await supabaseServer.from("notifications").insert({
        company_id: companyId,
        title: "Relatório Automático Enviado",
        message: `Relatório "${report.name}" (${report.frequency}) (${periodLabel}) enviado${
          recipients.length ? ` para ${recipients.join(", ")}` : ""
        }. Próximo: ${newNext.toISOString()}`,
        type: "success",
        category: "system",
        priority: "normal",
      });

      processed++;
    } catch (e: any) {
      console.error(`[AUTO_REPORT][${report.id}]`, e?.message || e);

      // se quiser: salvar falha em notification
      await supabaseServer.from("notifications").insert({
        company_id: report.company_id,
        title: "Falha ao Enviar Relatório Automático",
        message: `Relatório "${report.name}" falhou: ${e?.message || "erro desconhecido"}`,
        type: "error",
        category: "system",
        priority: "high",
      });
    }
  }

  return { processed };
}

function formatBR(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
