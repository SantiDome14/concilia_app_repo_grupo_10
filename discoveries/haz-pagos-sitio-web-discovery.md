---
name: Haz Pagos — Sitio web publico y su rol regulatorio (BCRA)
features: []
status: Concluida
owner: Santino Domeniconi
created_at: 2026-06-11
updated_at: 2026-06-11
propagates_to:
  - entities/haz-pagos.md
---

# Haz Pagos — Sitio web publico y su rol regulatorio (BCRA)

## Objetivo

Determinar si `haz-pagos.com` es un canal comercial activo que requiere trabajo de producto, o si su existencia responde exclusivamente a una obligacion regulatoria del BCRA sobre los PSP.

## Contexto

El 8 de junio de 2026, el equipo de compliance de Banco Frances visito `haz-pagos.com` como parte de su proceso de due diligence para abrir una cuenta operativa en Haz Pagos. Encontraron la web con errores tipograficos, CTAs rotos y contenido desactualizado. Mateo (Sales) estaba gestionando activamente esa relacion comercial.

El incidente fue reportado como requerimiento de producto (PWI-75) con el argumento de que la web representa un riesgo reputacional y comercial ante prospectos que realizan due diligence.

## Investigacion

### Consulta regulatoria

Se reviso el Texto Ordenado de Proveedores de Servicios de Pago del BCRA (ultima comunicacion incorporada: "A" 8287, vigente al 25/07/2025), la Comunicacion "A" 8102 (11/09/2024) y la Comunicacion "A" 8432 (06/05/2026).

**Hallazgo principal:** el TO de PSP no exige explicitamente que los PSPCP tengan un sitio web publico propio. Lo que si exige — por el Regimen Informativo de Transparencia — es que los PSPCP publiquen sus comisiones, cargos y condiciones de servicio, y que la informacion publicada en sus sitios de Internet sea coincidente con la remitida al BCRA.

En la practica, `haz-pagos.com` existe para cumplir con ese requisito de transparencia y como presencia institucional minima exigida por el registro PSP — no como canal de adquisicion o conversion comercial.

### Validacion con Head of Sales

Mauro Pascuccio (Head of Sales) confirmo que los prospectos no entran por `haz-pagos.com`. El pipeline comercial de Haz Pagos opera 100% por relaciones directas (outbound, referidos, gestiones de Sales). La web no es un touchpoint del proceso de venta ni de onboarding.

## Conclusion

`haz-pagos.com` es un sitio institucional de existencia regulatoria, no un canal comercial activo. Su mantenimiento y calidad de contenido son responsabilidad de la identidad corporativa del grupo, no del area de Producto.

PWI-75 fue deprecado con la causa: fuera de scope de Producto — los prospectos no ingresan por esa web, existe exclusivamente para cumplir con los requisitos regulatorios del BCRA aplicables a los PSP (confirmado por Mauro Pascuccio, Head of Sales).

## Referencias

- PWI-75 (DEPRECATED): https://arduasolutions.atlassian.net/browse/PWI-75
- Hilo de Slack: https://arduasolutions.slack.com/archives/C0AKNPCNNSU/p1780936892921619
- BCRA — Texto Ordenado PSP (Com. "A" 8287): https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-snp-psp.pdf
- BCRA — Regimen Informativo de Transparencia: https://www.bcra.gob.ar/pdfs/texord/t-ri-transpa.pdf
