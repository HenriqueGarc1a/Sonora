interface Props {
  title: string;
  onDragStart: (event: any) => void;
  onDragEnd: () => void;
}

export function DragHandle(props: Props): any {
  return (
    <button
      className="drag-handle"
      type="button"
      draggable={true}
      aria-label={`Arrastar ${props.title} para reordenar`}
      title="Arraste para reordenar"
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
    >
      <span /><span /><span /><span /><span /><span />
    </button>
  );
}
