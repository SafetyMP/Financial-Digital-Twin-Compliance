from __future__ import annotations

from datetime import date, datetime, timezone
from xml.sax.saxutils import escape


def generate_finrep_f01(taxonomy_version: str, maps: dict[str, str], figures: dict[str, float]) -> str:
    cash = figures.get("assets.cash", 1_000_000.0)
    loans = figures.get("assets.loans", 5_000_000.0)
    deposits = figures.get("liab.deposits", 4_500_000.0)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xmlns:cect="http://digitaltwin.local/finrep/f01/{escape(taxonomy_version)}"
      xsi:schemaLocation="http://digitaltwin.local/finrep/f01/{escape(taxonomy_version)} finrep-f01-fixture.xsd">
  <context id="c1">
    <entity><identifier scheme="http://digitaltwin.local/lei">CECTSEED000000001</identifier></entity>
    <period><instant>{date.today().isoformat()}</instant></period>
  </context>
  <unit id="uEUR"><measure>iso4217:EUR</measure></unit>
  <cect:{maps.get("assets.cash", "mi_cash")} contextRef="c1" unitRef="uEUR" decimals="0">{cash:.0f}</cect:{maps.get("assets.cash", "mi_cash")}>
  <cect:{maps.get("assets.loans", "mi_loans")} contextRef="c1" unitRef="uEUR" decimals="0">{loans:.0f}</cect:{maps.get("assets.loans", "mi_loans")}>
  <cect:{maps.get("liab.deposits", "mi_deposits")} contextRef="c1" unitRef="uEUR" decimals="0">{deposits:.0f}</cect:{maps.get("liab.deposits", "mi_deposits")}>
  <cect:taxonomyVersion contextRef="c1">{escape(taxonomy_version)}</cect:taxonomyVersion>
</xbrl>
"""


def generate_anacredit_t2(taxonomy_version: str, maps: dict[str, str], instruments: list[dict]) -> str:
    entries: list[tuple[str, str, float, str]] = []
    for inst in instruments:
        itype = inst.get("type", "loan")
        code = maps.get(itype, maps.get("loan", "CRDT"))
        entries.append(
            (
                str(inst.get("id", "i1")),
                code,
                float(inst.get("notional", 0)),
                str(inst.get("currency", "EUR")),
            )
        )
    if not entries:
        entries.append(("seed-1", "CRDT", 1_000_000.0, "EUR"))
    as_of = escape(date.today().isoformat())
    prepared = escape(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    series: list[str] = []
    for instrument_id, type_code, notional, currency in entries:
        series.append(
            "\n".join(
                [
                    "    <generic:Series>",
                    "      <generic:SeriesKey>",
                    f'        <generic:Value id="{escape("INSTRUMENT_ID")}" value="{escape(instrument_id)}"/>',
                    f'        <generic:Value id="{escape("INSTRUMENT_TYPE")}" value="{escape(type_code)}"/>',
                    f'        <generic:Value id="{escape("CURRENCY")}" value="{escape(currency)}"/>',
                    "      </generic:SeriesKey>",
                    "      <generic:Obs>",
                    f'        <generic:ObsDimension value="{as_of}"/>',
                    f'        <generic:ObsValue value="{escape(f"{notional:.2f}")}"/>',
                    "      </generic:Obs>",
                    "    </generic:Series>",
                ]
            )
        )
    body = "\n".join(series)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<message:GenericData xmlns:message="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message"
                     xmlns:generic="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic"
                     xmlns:common="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/common">
  <message:Header>
    <message:ID>ANACREDIT-T2</message:ID>
    <message:Test>true</message:Test>
    <message:Prepared>{prepared}</message:Prepared>
    <message:Sender id="{escape("DIGITALTWIN")}"/>
    <message:Structure structureID="{escape("ANA_T2")}" dimensionAtObservation="{escape("TIME_PERIOD")}">
      <common:Structure>
        <Ref agencyID="{escape("ECB")}" id="{escape("ANA_T2")}" version="{escape(taxonomy_version)}"/>
      </common:Structure>
    </message:Structure>
  </message:Header>
  <message:DataSet structureRef="{escape("ANA_T2")}">
{body}
  </message:DataSet>
</message:GenericData>
"""


def generate_dora_ict(taxonomy_version: str, maps: dict[str, str], assets: list[dict]) -> str:
    rows = []
    for asset in assets:
        name = asset.get("name", "unknown")
        code = maps.get(name, maps.get("core-banking", "ICT-CORE"))
        rows.append(
            f'    <ICTAsset name="{escape(str(name))}" '
            f'function="{escape(code)}" '
            f'criticality="{escape(str(asset.get("criticality", "high")))}"/>'
        )
    body = "\n".join(rows)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<DORAICTRegister xmlns="http://digitaltwin.local/dora/ict"
                 taxonomyVersion="{escape(taxonomy_version)}"
                 asOf="{date.today().isoformat()}">
{body}
</DORAICTRegister>
"""
