/**
 * Load choices.js base styles as plain CSS (avoids Sass "Operators aren't allowed in plain CSS"
 * when using webpack). Then load app.scss which includes _choice.scss overrides.
 */
import "choices.js/public/assets/styles/choices.min.css";
import "./scss/app.scss";
