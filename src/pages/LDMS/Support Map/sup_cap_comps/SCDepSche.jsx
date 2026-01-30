// src/pages/LDMS/Support Map/sup_cap_comps/SCDepSche.jsx
import React, { useEffect, useState, useContext } from "react";
import { FaUsers, FaBuilding, FaArrowRight } from "react-icons/fa";
import { LOOKUP_API } from "../../../../api/axios";
import ShgListTable from "../../../Dashboard/ShgListTable";
import ShgMemberListTable from "../../../Dashboard/ShgMemberListTable";
import { AuthContext } from "../../../../contexts/AuthContext";

export default function SCDepSche({
  onSelectionChange,
  selectedMemberCodes = new Set(),
}) {
  const { user } = useContext(AuthContext) || {};
  const [blockId, setBlockId] = useState(null);
  const [selectedShg, setSelectedShg] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);

  /* ---------------- Load User Block ---------------- */
  useEffect(() => {
    async function loadGeoscope() {
      try {
        setLoadingGeo(true);
        if (!user?.id) return;

        const res = await LOOKUP_API.userGeoscopeByUserId(user.id);
        const blocks = res?.data?.blocks || [];
        if (blocks.length) setBlockId(blocks[0]);
      } finally {
        setLoadingGeo(false);
      }
    }
    loadGeoscope();
  }, [user?.id]);

  /* ---------------- Toggle Member ---------------- */
  function handleToggleMember(member, checked) {
    const code =
      member?.member_code || member?.lokos_member_code || member?.id;
    if (!code) return;

    onSelectionChange?.({
      type: checked ? "ADD" : "REMOVE",
      payload: {
        member,
        shg: selectedShg,
      },
    });
  }
  return (
    <div className="sc-dep-sche">
      {/* -------- STEP INDICATOR -------- */}
      <div className="sc-steps">
        <span
          className={!selectedShg ? "active clickable" : "clickable"}
          onClick={() => setSelectedShg(null)}
          title="Back to SHG list"
        >
          <FaBuilding /> SHGs in Your Block
        </span>

        <FaArrowRight />

        <span className={selectedShg ? "active" : ""}>
          <FaUsers /> Beneficiaries (Select)
        </span>
      </div>

      {/* -------- STEP 1: SHG LIST -------- */}
      {!selectedShg && (
        <>
          {loadingGeo ? (
            <p className="muted">Loading user block…</p>
          ) : (
            <ShgListTable
              blockId={blockId}
              onSelectShg={(shg) => setSelectedShg(shg)}
            />
          )}
        </>
      )}

      {/* -------- STEP 2: MEMBER LIST -------- */}
      {selectedShg && (
        <ShgMemberListTable
          shg={selectedShg}
          onToggleMember={handleToggleMember}
          selectedMemberCodes={selectedMemberCodes}
        />
      )}

      {/* ---------------- Styles ---------------- */}
      <style>{`
        .sc-dep-sche {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sc-steps {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: #9ca3af;
        }

        .clickable {
        cursor: pointer;
        }

        .clickable:hover {
        text-decoration: underline;
        }

        .sc-steps span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sc-steps span.active {
          color: #7a0c0c;
        }

        .muted {
          color: #9ca3af;
          font-style: italic;
        }

        @media (max-width: 1024px) {
          .sc-steps {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
