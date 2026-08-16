import React from "react";

/**
 * Todo el estilo va en versales, pero hay marcas que son minúscula por diseño y
 * escritas en caja alta cantan a error delante de una audiencia técnica. Este
 * helper les devuelve su caja dejando el uppercase heredado intacto en el resto.
 *
 * En este reel no se nombra ninguna marca — la lista está vacía a propósito y
 * el helper se queda por si más adelante se añade una tarjeta que sí la nombre.
 */
const LOWERCASE_BRANDS: string[] = [];

const RE = LOWERCASE_BRANDS.length
  ? new RegExp(`(${LOWERCASE_BRANDS.join("|")})`, "gi")
  : null;

export const brand = (text: string): React.ReactNode => {
  if (!RE) return text;
  return text.split(RE).map((part, i) =>
    LOWERCASE_BRANDS.includes(part.toLowerCase()) ? (
      <span key={i} style={{ textTransform: "none" }}>
        {part.toLowerCase()}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
};

/** ¿El token del karaoke es una marca en minúscula (con puntuación pegada)? */
export const isBrandToken = (t: string) =>
  LOWERCASE_BRANDS.includes(t.replace(/[.,;:!?¡¿"']/g, "").toLowerCase());
