import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { postSchema } from "./schemas/post";
import { caseSchema } from "./schemas/case";

export default defineConfig({
    name: "77xp-studio",
    title: "77xp Tech Solutions CMS",
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "placeholder",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    basePath: "/studio",
    plugins: [structureTool()],
    schema: {
        types: [postSchema, caseSchema],
    },
});
