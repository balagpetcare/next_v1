"use client";
import Image from "next/image";

import React from "react";
import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

type NodePos = "tl" | "tr" | "bl" | "br";

const nodes: Array<{
  icon: string;
  titleKey: string;
  pos: NodePos;
}> = [
  { icon: "solar:user-check-bold-duotone", titleKey: "node1Title", pos: "tl" },
  { icon: "solar:buildings-2-bold-duotone", titleKey: "node2Title", pos: "tr" },
  { icon: "solar:document-text-bold-duotone", titleKey: "node3Title", pos: "bl" },
  { icon: "solar:cart-large-2-bold-duotone", titleKey: "node4Title", pos: "br" },
];

export default function HowToStartDiagramSection() {
  const { t } = useLanguage();

  return (
    <section
      id="how-to-start-diagram"
      className="jamina-diagram-section px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20"
      aria-labelledby="diagram-title"
    >
      <div className="lp-container max-w-6xl mx-auto">
        <div className="jamina-diagram-head mb-6 sm:mb-8">
          <h2 id="diagram-title" className="lp-h2 pb-60 jamina-diagram-title">
            {t("howToStartDiagram.title")}
          </h2>
          <p className="lp-subtitle jamina-diagram-subtitle">
            {t("howToStartDiagram.subtitle")}
          </p>
        </div>

        <div className="jamina-diagram-stage" role="img" aria-label={t("howToStartDiagram.diagramAlt")}>
          {/* soft background accents */}
          <span className="jamina-diagram-bg-orb jamina-orb-1" aria-hidden="true" />
          <span className="jamina-diagram-bg-orb jamina-orb-2" aria-hidden="true" />

                   {/* center hub */}
              <div className="jamina-diagram-center">
                <div className="jamina-diagram-center-image-wrap">
                  <Image
                    src="/landing/images/how-to-start-center.png"
                    alt={t("howToStartDiagram.centerImageAlt")}
                    fill
                    className="jamina-diagram-center-image"
                    priority
                  />
                </div>
              </div>


          {/* nodes */}
          {nodes.map((node) => (
            <div key={node.titleKey} className={`jamina-diagram-node is-${node.pos}`}>
              {/* connector line */}
              <span className="jamina-diagram-link" aria-hidden="true" />

              <div className="jamina-diagram-node-card">
                <span className="jamina-diagram-node-icon" aria-hidden="true">
                  <Icon icon={node.icon} width={30} height={30} />
                </span>
                <span className="jamina-diagram-node-text">
                  {t(`howToStartDiagram.${node.titleKey}`)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* SR-only content for SEO/accessibility */}
        <ul className="sr-only">
          {nodes.map((n) => (
            <li key={n.titleKey}>{t(`howToStartDiagram.${n.titleKey}`)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
