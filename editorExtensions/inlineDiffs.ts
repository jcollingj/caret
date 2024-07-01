import { Extension, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
export const redBackgroundField = StateField.define<DecorationSet>({
    create(state): DecorationSet {
        return Decoration.none;
    },
    update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const docText = transaction.state.doc.toString();
        // @ts-ignore
        const delete_regex = /\|-(.*?)-\|/gs; // Changed to match across lines
        // @ts-ignore
        const add_regex = /\|\+(.*?)\+\|/gs; // Changed to match across lines
        let delete_match;
        let add_match;
        let ranges = [];

        while ((delete_match = delete_regex.exec(docText)) !== null) {
            const start = delete_match.index;
            const end = delete_regex.lastIndex;
            ranges.push({ start, end, style: "background-color: #f56c62;" });
        }

        while ((add_match = add_regex.exec(docText)) !== null) {
            const start = add_match.index;
            const end = add_regex.lastIndex;
            ranges.push({ start, end, style: "background-color: #64f562;" });
        }
        // Sort ranges by start position
        ranges.sort((a, b) => a.start - b.start);

        // Add sorted ranges to the builder
        ranges.forEach((range) => {
            builder.add(
                range.start,
                range.end,
                Decoration.mark({
                    attributes: { style: range.style },
                })
            );
        });

        return builder.finish();
    },
    provide(field: StateField<DecorationSet>): Extension {
        return EditorView.decorations.from(field);
    },
});
