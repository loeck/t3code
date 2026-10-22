import type { Project, ServerSettings } from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { resolveProjectAutoPull } from "@t3tools/shared/serverSettings";
import { resolveProjectScripts } from "@t3tools/shared/projectScripts";
import * as Effect from "effect/Effect";

import * as ServerSettingsService from "../serverSettings.ts";

/**
 * The project with the scripts, default model, thread mode and auto-pull that
 * actually apply to it, since the row's own fields are ignored once project
 * settings are folded into the override store.
 */
export function withEffectiveProjectSettings(settings: ServerSettings, project: Project): Project {
  const effective = resolveProjectSettings(settings, project.id, project).settings;
  return {
    ...project,
    scripts: resolveProjectScripts(settings, project),
    defaultModelSelection: effective.defaultModelSelection,
    defaultThreadEnvMode: effective.defaultThreadEnvMode,
    autoPull: resolveProjectAutoPull(settings, project.id, project.autoPull),
  };
}

/**
 * Reads settings once for the whole batch. A settings read failure is not a
 * project read failure, so the rows come back as stored.
 */
export const withEffectiveProjectsSettings = Effect.fn("project.withEffectiveProjectsSettings")(
  function* (projects: ReadonlyArray<Project>) {
    const settings = yield* ServerSettingsService.ServerSettingsService.pipe(
      Effect.flatMap((service) => service.getSettings),
      Effect.catch((error) =>
        Effect.logWarning(
          "Project settings are unavailable; reporting stored project values.",
          error,
        ).pipe(Effect.as(null)),
      ),
    );
    return settings === null
      ? projects
      : projects.map((project) => withEffectiveProjectSettings(settings, project));
  },
);

export const withEffectiveProjectSettingsOf = Effect.fn("project.withEffectiveProjectSettingsOf")(
  function* (project: Project) {
    const [effective = project] = yield* withEffectiveProjectsSettings([project]);
    return effective;
  },
);
