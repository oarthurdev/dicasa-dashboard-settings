import { type Request, type Response, type NextFunction } from "express";
import { supabaseClient } from "../supabase.ts";

export async function companyContext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const host = req.headers.host || "";
  const subdomain = host.split(".")[0]; // 'dicasaindaial' de 'dicasaindaial.imobiliario.tec.br'

  console.log("Host header:", req.headers.host);
  console.log(
    "URL completa:",
    req.protocol + "://" + req.headers.host + req.originalUrl,
  );

  console.log("Subdomain: ", subdomain);

  try {
    const { data, error } = await supabaseClient
      .from("companies")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    console.log("Empresa encontrada: ", data);

    if (error || !data) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    // Armazena o ID da empresa na requisição
    (req as any).companyId = data.id;

    next();
  } catch (err) {
    next(err);
  }
}
