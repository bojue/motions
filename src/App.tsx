import { useState } from "react";
import type { Project } from "./model/project";
import { saveProject } from "./model/project";
import { CanvaEditorView } from "./views/CanvaEditorView";
import { QuickStartWizard } from "./views/QuickStartWizard";

export default function App() {
  const [mode, setMode] = useState<"wizard" | "editor">("wizard");
  const [project, setProject] = useState<Project | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [editorKey, setEditorKey] = useState(0);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {mode === "wizard" ? (
        <QuickStartWizard
          key={wizardKey}
          onFinish={(next) => {
            saveProject(next);
            setProject(next);
            setEditorKey((value) => value + 1);
            setMode("editor");
          }}
          onSkip={() => {
            setProject(null);
            setEditorKey((value) => value + 1);
            setMode("editor");
          }}
        />
      ) : (
        <CanvaEditorView
          key={editorKey}
          initialProject={project}
          onStartWizard={() => {
            setWizardKey((value) => value + 1);
            setMode("wizard");
          }}
        />
      )}
    </div>
  );
}
