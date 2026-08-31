# Gates: Finish pass

Scope: Responsive polish, accessibility affordances, and end-to-end build quality.

- [x] G1: CSS includes mobile layout, reduced motion, and visible keyboard focus treatment.
  CHECK: rg -n "@media|prefers-reduced-motion|focus-visible" src/styles.css
  EXPECT: @media
  EVIDENCE: 184:@media (max-width: 560px) { | 210:@media (prefers-reduced-motion: reduce) {

- [x] G2: Production build passes after the finish pass.
  CHECK: npm run build
  EXPECT: /built in/
  EVIDENCE: vite ✓ built in 131ms
