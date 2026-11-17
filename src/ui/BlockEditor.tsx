import type { Block, Tab } from "../domain/model";
import { useEditor } from "../store/editor";
import ArrangementSetup from "./ArrangementSetup";
import TabEditor from "./TabEditor";
import LyricEditor from "./LyricEditor";

function ArrangementEditor({
  tab,
  onCustomize,
}: {
  tab: Tab;
  onCustomize: (id: string) => void;
}) {
  const { song, updateBlock } = useEditor();
  return (
    <>
      <ArrangementSetup
        tab={tab}
        fallback={song.instrument}
        onChange={(instrument) =>
          updateBlock(tab.id, (b) => {
            if (b.kind === "tab") b.instrument = instrument;
          })
        }
        onCustom={() => onCustomize(tab.id)}
      />
      <TabEditor tab={tab} />
    </>
  );
}
export default function BlockEditor({
  block,
  sectionId,
  onCustomize,
}: {
  block: Block;
  sectionId: string;
  onCustomize: (id: string) => void;
}) {
  if (block.kind === "lyrics")
    return <LyricEditor line={block} sectionId={sectionId} />;
  if (block.kind === "tab")
    return <ArrangementEditor tab={block} onCustomize={onCustomize} />;
  return (
    <div className="combined-block-editor">
      <section aria-label="Arranjo do bloco combinado">
        <h3>Arranjo instrumental</h3>
        <ArrangementEditor tab={block.tab} onCustomize={onCustomize} />
      </section>
      <section aria-label="Letra do bloco combinado">
        <h3>Letra e acordes</h3>
        <LyricEditor line={block.lyrics} sectionId={sectionId} />
      </section>
    </div>
  );
}
