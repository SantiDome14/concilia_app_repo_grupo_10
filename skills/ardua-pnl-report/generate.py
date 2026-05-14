#!/usr/bin/env python3
"""
generate.py — CLI entry point para el Skill Reporte de P&L.

Uso:
    python generate.py <report_type> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
                                     [--master /path/to/MASTER.xlsx]
                                     [--output /path/to/output_dir]

Ejemplos:
    python generate.py daily
    python generate.py custom --from 2026-01-01 --to 2026-03-31
    python generate.py daily --master ~/Desktop/BANCOS/MASTER.xlsx --output ./out

Convención de fuente:
    Por default espera el archivo en `~/Desktop/BANCOS/MASTER.xlsx`.
    Cada usuario crea esa carpeta en su Desktop y deja el MASTER ahí.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pnl_report import generate_report, PnLError


# Fuente canónica del MASTER — convención multi-usuario.
# Path.home() resuelve dinámicamente al home del usuario que corre el script.
DEFAULT_MASTER = Path.home() / 'Desktop' / 'BANCOS' / 'MASTER.xlsx'

# Destino por default: directorio de outputs de Claude (artifacts).
# Para uso CLI standalone pasar --output con una ruta local.
DEFAULT_OUTPUT = Path('/mnt/user-data/outputs')


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description='Genera el reporte de P&L de Ardua en HTML print-ready.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument('report_type', choices=['daily', 'weekly', 'monthly', 'custom'],
                   help='Tipo de reporte')
    p.add_argument('--from', dest='from_date', help='Fecha desde (YYYY-MM-DD). Solo para custom.')
    p.add_argument('--to', dest='to_date', help='Fecha hasta (YYYY-MM-DD). Solo para custom.')
    p.add_argument('--master', default=str(DEFAULT_MASTER),
                   help=f'Path a MASTER.xlsx. Default: {DEFAULT_MASTER}')
    p.add_argument('--output', default=str(DEFAULT_OUTPUT),
                   help=f'Directorio de salida. Default: {DEFAULT_OUTPUT}')
    return p.parse_args()


def _format_money(n: float) -> str:
    a = abs(n)
    if a >= 1e6:
        return f"${n/1e6:,.2f}M"
    if a >= 1e3:
        return f"${n/1e3:,.2f}K"
    return f"${n:,.2f}"


def main() -> int:
    args = _parse_args()

    master_path = Path(args.master)
    if not master_path.exists():
        print(
            f"✗ No encuentro MASTER.xlsx en `{master_path}`.\n"
            f"  Asegurate de tener el archivo en esa ubicación. La convención del "
            f"Skill es `~/Desktop/BANCOS/MASTER.xlsx`.",
            file=sys.stderr,
        )
        return 1

    try:
        result = generate_report(
            master_path=master_path,
            report_type=args.report_type,
            from_date=args.from_date,
            to_date=args.to_date,
            output_dir=args.output,
        )
    except PnLError as e:
        print(f"✗ {e}", file=sys.stderr)
        return 1

    label = {
        'daily': 'Daily', 'weekly': 'Weekly',
        'monthly': 'Monthly', 'custom': 'Custom',
    }[result['report_type']]
    if result['report_type'] == 'custom':
        period = f"{result['from_date']} → {result['to_date']}"
    else:
        period = result['to_date']

    print(f"✓ P&L {label} generado · {period} · {result['transfers']} transacciones")
    print(f"  Archivo: {result['path']}")
    print(f"  Revenue: {_format_money(result['revenue'])}  ·  "
          f"Volume: {_format_money(result['volume'])}  ·  "
          f"Transfers: {result['transfers']}  ·  "
          f"Top Segment: {result['top_segment']} ({result['top_segment_pct']:.1f}%)")
    return 0


if __name__ == '__main__':
    sys.exit(main())
