import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import IntroSection from "./IntroSection";
import BasicsSection from "./BasicsSection";
import GreeksSection from "./GreeksSection";
import IVSection from "./IVSection";
import StrategiesSection from "./StrategiesSection";

const SECTIONS = [
  { id: "intro",      label: "Start Here" },
  { id: "basics",     label: "Basics" },
  { id: "greeks",     label: "The Greeks" },
  { id: "iv",         label: "Volatility" },
  { id: "strategies", label: "Strategies" },
];

export default function LearnPage() {
  const [section, setSection] = useState("intro");
  const navigate = useNavigate();

  return (
    <motion.div
      className="learn-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
    >
      <div className="learn-topbar">
        <div className="learn-topbar-left">
          <button className="learn-back-btn" onClick={() => navigate("/")}>
            <ArrowLeft size={13} /> Back
          </button>
          <h1 className="learn-heading">Options Glossary</h1>
        </div>
        <nav className="learn-nav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`learn-nav-btn${section === s.id ? " learn-nav-btn--active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {section === "intro"      && <IntroSection />}
          {section === "basics"     && <BasicsSection />}
          {section === "greeks"     && <GreeksSection />}
          {section === "iv"         && <IVSection />}
          {section === "strategies" && <StrategiesSection />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
