import { useEffect, useRef } from 'react';

/**
 * A personal project's live build in a modal "screen". Nothing loads until it
 * opens; <dialog> gives focus trapping and Esc for free.
 * @param {{ project: { title: string, embed: string } | null, onClose: () => void }} props
 */
export function GameScreen({ project, onClose }) {
  const dialog = useRef(/** @type {HTMLDialogElement | null} */ (null));
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (project && !d.open) d.showModal();
    if (!project && d.open) d.close();
  }, [project]);

  return (
    <dialog ref={dialog} className="screen" aria-label={project ? `${project.title}, playing` : 'Game'} onClose={onClose}>
      {project && (
        <>
          <div className="screen-bar">
            <span className="hud">▶ Now playing · {project.title}</span>
            <a className="screen-link" href={project.embed} rel="noopener">
              Open full page<span className="sr-only"> (external site)</span>
            </a>
            <button type="button" onClick={onClose} aria-label="Close game">
              ✕
            </button>
          </div>
          <iframe
            title={project.title}
            src={project.embed}
            allow="autoplay; fullscreen; gamepad"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
          />
        </>
      )}
    </dialog>
  );
}
