import pytest

from reporting_service.generators import generate_anacredit_t2, generate_dora_ict, generate_finrep_f01
from reporting_service.validate import ValidationError, validate_report


def test_finrep_validates():
    maps = {"assets.cash": "mi_cash", "assets.loans": "mi_loans", "liab.deposits": "mi_deposits"}
    xml = generate_finrep_f01("2024.1", maps, {"assets.cash": 1, "assets.loans": 2, "liab.deposits": 3})
    validate_report("FINREP_F01", xml)


def test_finrep_non_decimal_fact_fails_the_taxonomy_schema():
    maps = {"assets.cash": "mi_cash", "assets.loans": "mi_loans", "liab.deposits": "mi_deposits"}
    xml = generate_finrep_f01("2024.1", maps, {"assets.cash": 1, "assets.loans": 2, "liab.deposits": 3})
    forged = xml.replace(">1<", ">not-a-number<", 1)
    with pytest.raises(ValidationError, match="mi_cash"):
        validate_report("FINREP_F01", forged)


def test_finrep_local_names_without_the_pinned_taxonomy_fail():
    forged = """<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance">
  <context id="c1"/>
  <mi_cash>1</mi_cash>
  <mi_loans>2</mi_loans>
  <mi_deposits>3</mi_deposits>
  <taxonomyVersion>2024.1</taxonomyVersion>
</xbrl>
"""
    with pytest.raises(ValidationError):
        validate_report("FINREP_F01", forged)


def test_anacredit_validates():
    xml = generate_anacredit_t2("2024.1", {"loan": "CRDT"}, [{"id": "a", "type": "loan", "notional": 10}])
    validate_report("ANACREDIT_T2", xml)


def test_anacredit_local_name_without_taxonomy_fails():
    forged = """<?xml version="1.0" encoding="UTF-8"?>
<AnaCreditTable2 taxonomyVersion="2024.1">
  <Instrument id="a" type="CRDT" notional="10" currency="EUR"/>
</AnaCreditTable2>
"""
    with pytest.raises(ValidationError):
        validate_report("ANACREDIT_T2", forged)


def test_anacredit_unnamespaced_generic_data_fails():
    forged = """<?xml version="1.0" encoding="UTF-8"?>
<GenericData>
  <Header>
    <ID>ANACREDIT-T2</ID>
    <Test>true</Test>
    <Prepared>2026-10-11T00:00:00Z</Prepared>
    <Sender id="DIGITALTWIN"/>
  </Header>
  <ObsValue value="10.00"/>
</GenericData>
"""
    with pytest.raises(ValidationError):
        validate_report("ANACREDIT_T2", forged)


def test_anacredit_empty_dataset_fails():
    forged = """<?xml version="1.0" encoding="UTF-8"?>
<message:GenericData xmlns:message="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message"
                     xmlns:generic="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic"
                     xmlns:common="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/common">
  <message:Header>
    <message:ID>ANACREDIT-T2</message:ID>
    <message:Test>true</message:Test>
    <message:Prepared>2026-10-11T00:00:00Z</message:Prepared>
    <message:Sender id="DIGITALTWIN"/>
    <message:Structure structureID="ANA_T2">
      <common:Structure>
        <Ref agencyID="ECB" id="ANA_T2" version="2024.1"/>
      </common:Structure>
    </message:Structure>
  </message:Header>
  <message:DataSet structureRef="ANA_T2"/>
</message:GenericData>
"""
    with pytest.raises(ValidationError):
        validate_report("ANACREDIT_T2", forged)


def test_dora_validates():
    xml = generate_dora_ict("2024.1", {"kafka": "ICT-MSG"}, [{"name": "kafka"}])
    validate_report("DORA_ICT", xml)


def test_dora_asset_without_a_name_fails_the_schema():
    forged = """<?xml version="1.0" encoding="UTF-8"?>
<DORAICTRegister xmlns="http://digitaltwin.local/dora/ict" taxonomyVersion="2024.1" asOf="2026-10-11">
  <ICTAsset function="ICT-MSG" criticality="high"/>
</DORAICTRegister>
"""
    with pytest.raises(ValidationError, match="name"):
        validate_report("DORA_ICT", forged)


def test_dora_local_name_without_taxonomy_fails():
    forged = """<?xml version="1.0" encoding="UTF-8"?>
<DORAICTRegister taxonomyVersion="2024.1">
  <ICTAsset name="kafka" function="ICT-MSG" criticality="high"/>
</DORAICTRegister>
"""
    with pytest.raises(ValidationError):
        validate_report("DORA_ICT", forged)
