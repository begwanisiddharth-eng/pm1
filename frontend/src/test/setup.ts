import "@testing-library/jest-dom";

// jsdom does not implement scrollIntoView; stub it so component effects don't throw.
Element.prototype.scrollIntoView = () => {};
