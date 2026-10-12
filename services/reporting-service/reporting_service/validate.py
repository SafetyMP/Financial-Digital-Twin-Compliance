from __future__ import annotations

import os

from lxml import etree


class ValidationError(Exception):
    pass


# XBRL 2.1 binds an instance to a taxonomy. This fixture uses xsi:schemaLocation
# and requires the monetary concepts to live in that taxonomy namespace.
# A matching local name in any other namespace is not a FINREP fact.
_XSI = "http://www.w3.org/2001/XMLSchema-instance"
_FINREP_CONCEPTS = ("mi_cash", "mi_loans", "mi_deposits")


def validate_finrep_fixture(xml_text: str) -> None:
    """FINREP F01 fixture check bound to the pinned taxonomy namespace."""
    root = etree.fromstring(xml_text.encode("utf-8"))
    if "xbrl" not in root.tag:
        raise ValidationError("not an xbrl root")
    if not root.xpath(".//*[local-name()='context']"):
        raise ValidationError("missing context")
    versions = root.xpath(".//*[local-name()='taxonomyVersion']")
    if not versions or not (versions[0].text or "").strip():
        raise ValidationError("missing taxonomyVersion pin")
    version = versions[0].text.strip()
    concept_ns = f"http://digitaltwin.local/finrep/f01/{version}"
    schema_location = root.get(f"{{{_XSI}}}schemaLocation") or ""
    if concept_ns not in schema_location:
        raise ValidationError("schemaLocation does not pin the taxonomyVersion")
    for name in _FINREP_CONCEPTS:
        if root.find(f".//{{{concept_ns}}}{name}") is None:
            raise ValidationError(f"missing FINREP concept {name} in {concept_ns}")
    _validate_finrep_facts(root, concept_ns)


def _taxonomy_xsd(filename: str) -> str:
    if "REPORTING_FIXTURES_DIR" in os.environ:
        directory = os.environ["REPORTING_FIXTURES_DIR"]
    else:
        directory = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "fixtures", "taxonomies")
        )
    return os.path.join(directory, filename)


def _finrep_xsd_path() -> str:
    return _taxonomy_xsd("finrep-f01-fixture.xsd")


def _validate_finrep_facts(root: etree.Element, concept_ns: str) -> None:
    """XBRL 2.1 schemaRef: the facts have to satisfy the taxonomy schema, not only its namespace."""
    path = _finrep_xsd_path()
    if not os.path.isfile(path):
        raise ValidationError(f"FINREP taxonomy schema was not found at {path}")
    schema_doc = etree.parse(path)
    target = schema_doc.getroot().get("targetNamespace") or ""
    if target != concept_ns:
        raise ValidationError(f"taxonomy schema {target} does not match {concept_ns}")
    schema = etree.XMLSchema(schema_doc)
    for name in (*_FINREP_CONCEPTS, "taxonomyVersion"):
        element = root.find(f"{{{concept_ns}}}{name}")
        if element is None:
            raise ValidationError(f"missing FINREP concept {name} in {concept_ns}")
        if not schema.validate(element):
            raise ValidationError(f"FINREP concept {name} does not match the taxonomy schema")


_DORA_NS = "http://digitaltwin.local/dora/ict"
_SDMX_MESSAGE = "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message"
_SDMX_GENERIC = "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic"


def _require_taxonomy_root(root: etree.Element, namespace: str, local_name: str) -> None:
    if root.tag != f"{{{namespace}}}{local_name}":
        raise ValidationError(f"root is not {{{namespace}}}{local_name}")
    if not (root.get("taxonomyVersion") or "").strip():
        raise ValidationError("missing taxonomyVersion")


# This check is the SDMX-ML 2.1 generic data envelope, not an ECB AnaCredit XML submission schema.
def validate_anacredit(xml_text: str) -> None:
    root = etree.fromstring(xml_text.encode("utf-8"))
    if root.tag != f"{{{_SDMX_MESSAGE}}}GenericData":
        raise ValidationError("root is not an SDMX-ML 2.1 message:GenericData")
    header = root.find(f"{{{_SDMX_MESSAGE}}}Header")
    if header is None:
        raise ValidationError("missing message:Header")
    for name in ("ID", "Test", "Prepared"):
        element = header.find(f"{{{_SDMX_MESSAGE}}}{name}")
        if element is None or not (element.text or "").strip():
            raise ValidationError(f"missing message:{name}")
    sender = header.find(f"{{{_SDMX_MESSAGE}}}Sender")
    if sender is None or not (sender.get("id") or "").strip():
        raise ValidationError("missing message:Sender id")
    if not any((ref.get("version") or "").strip() for ref in header.findall(".//Ref")):
        raise ValidationError("missing Ref version")
    instrument_ids = root.findall(f".//{{{_SDMX_GENERIC}}}SeriesKey/{{{_SDMX_GENERIC}}}Value")
    if not any(
        value.get("id") == "INSTRUMENT_ID" and (value.get("value") or "").strip() for value in instrument_ids
    ):
        raise ValidationError("missing generic:SeriesKey INSTRUMENT_ID")
    obs_values = root.findall(f".//{{{_SDMX_GENERIC}}}ObsValue")
    if not any((obs.get("value") or "").strip() for obs in obs_values):
        raise ValidationError("missing generic:ObsValue")


def validate_dora(xml_text: str) -> None:
    root = etree.fromstring(xml_text.encode("utf-8"))
    _require_taxonomy_root(root, _DORA_NS, "DORAICTRegister")
    if root.find(f"{{{_DORA_NS}}}ICTAsset") is None:
        raise ValidationError("no ICT assets in the DORA taxonomy")
    _validate_document_schema(root, _DORA_NS, "dora-ict-fixture.xsd")


def _validate_document_schema(root: etree.Element, concept_ns: str, filename: str) -> None:
    path = _taxonomy_xsd(filename)
    if not os.path.isfile(path):
        raise ValidationError(f"taxonomy schema was not found at {path}")
    schema_doc = etree.parse(path)
    target = schema_doc.getroot().get("targetNamespace") or ""
    if target != concept_ns:
        raise ValidationError(f"taxonomy schema {target} does not match {concept_ns}")
    schema = etree.XMLSchema(schema_doc)
    if schema.validate(root):
        return
    raise ValidationError(f"document does not match the taxonomy schema: {schema.error_log.last_error}")


def validate_report(report_type: str, xml_text: str) -> None:
    if report_type == "FINREP_F01":
        validate_finrep_fixture(xml_text)
    elif report_type == "ANACREDIT_T2":
        validate_anacredit(xml_text)
    elif report_type == "DORA_ICT":
        validate_dora(xml_text)
    else:
        raise ValidationError(f"unknown report_type {report_type}")
