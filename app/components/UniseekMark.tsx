// The Uniseek mark — four offset blades, drawn in currentColor so it takes the colour of
// whatever it sits in.
//
// It was inlined identically in the footer, the "What is Uniseek" section and the Why
// brandmark before this, which meant four copies of the same path data once the header
// wanted one too. The viewBox and the transform are the artboard the mark was drawn on;
// they look arbitrary because they are, and they're why this is worth having in one file.

export default function UniseekMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 53.54897 63.90451" role="img" aria-label="Uniseek logo">
      <g transform="translate(-206.93265,-157.98483)" fill="currentColor">
        <path d="M220.40922,221.88934l-13.47657,-37.2094l27.26349,-9.87434l13.47657,37.2094z" />
        <path d="M247.36661,212.12256l-4.22689,-11.67064l13.11501,-4.75002l4.22689,11.67064z" />
        <path d="M238.2259,186.65474l-4.25975,-11.76135l13.11501,-4.75002l4.25975,11.76135z" />
        <path d="M217.29163,177.1945l-4.91598,-13.57324l15.56242,-5.63643l4.91598,13.57324z" />
      </g>
    </svg>
  );
}
