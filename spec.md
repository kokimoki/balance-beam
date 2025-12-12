# Team Balance Game Specification

## Overview
- Cooperative exercise where all players share a single balance beam visible on presenter and player devices.
- Goal: Keep the beam as balanced as possible while additional players drop onto it at regular intervals.
- Physics simulate a free-spinning beam pinned at the center: player weight and position create torque that affects angular acceleration, the beam can rotate a full 360 degrees (multiple times if momentum allows), and host-controlled physics speed still scales update cadence for accessibility.

## Roles
- **Host**: Adjusts deployment interval and physics speed multipliers, monitors status values (no extra graphics required).
- **Presenter**: Displays the current beam state, total deployed count, global timer, and a countdown showing when the next player will drop so the audience can prepare. Each deployed player must appear with a unique color-coded badge whose radius scales with that player's weight so bigger weights render as larger circles, and the badge should include their initials for quick identification.
- **Player**: Enters name and weight, sees a personal countdown until deployment, then controls their avatar on the beam with left/right inputs even if dropped while temporarily offline.

## Player Lifecycle
1. Join lobby → enter name + weight (weight chosen via a slider limited to 25–125 kg in 5 kg increments).
2. Added to deployment queue immediately (late joins appended to end).
3. Lobby shows personal countdown with deployment timestamp derived from global interval.
4. When countdown completes, player is deployed at a random beam position even if client is offline; if offline, avatar still appears using stored data.
5. After deployment, player sees the full beam with their avatar highlighted and can move left/right; movements sync via shared state.

## Timers & Deployment
- Global deployment interval (milliseconds/seconds) configurable by host.
- Global controller schedules drops by timestamp queue; presenter shows time remaining until next drop and lists next player name.
- Player devices show their own `timeUntilDeploy` based on queue position and interval.

## Physics & Beam State
- Maintain beam angle (in degrees without clamping), angular velocity, and per-player position/weight data in shared state. Each player is automatically assigned a deterministic custom color stored in shared state so it can be reused across sessions; presenter view renders those colors with weight-scaled badges and initials.
- Host sets physics speed multiplier (e.g., `0.5x–2x`) to slow/accelerate updates; applies during global controller ticks.
- Global controller runs the physics tick roughly five times per second to keep beam motion visually smooth while still respecting server timestamps.
- Beam dynamics follow torque/inertia math instead of a spring: the sum of `(weight * position * cos(angle))` determines angular acceleration, angular velocity is integrated over time with light damping, and resulting angles may wrap multiple full rotations.
- Beam considered unstable if the normalized angle (modulo 360°) exceeds a configurable threshold. When the unstable threshold is exceeded, show a red warning indicator on presenter and all player views so everyone can react.

## Cooperative Assignments
- After the final queued player is deployed (queue empty and everyone marked `deployed`), automatically start a six-step cooperative assignment track without requiring host input.
- Only one assignment is active at a time; players, host, and presenter views surface the current task with Markdown copy pulled from config.
- Completion is timed in seconds (displayed with one decimal of precision) and requires holding the beam within ±5° of level for 10 seconds after fulfilling each task-specific condition below:
  1. **Balance the beam** – once everyone is on the beam, simply hold the beam level for 10 seconds.
  2. **Clear the center third** – every deployed player moves outside the center third (visualized on the beam) and remains there during the final balance hold.
  3. **Switch sides** – each player crosses to the opposite side relative to where they started the assignment, then the team re-balances.
  4. **Full rotation** – rotate the beam at least 360° in one direction, then stabilize at zero.
  5. **Touch the bottom** – tilt to at least 90° once (“touch the bottom”) before returning to balance.
  6. **Double rotation** – rotate twice (720° total) before finishing with a balance hold.
- The beam visualization highlights the center third whenever assignment #2 is active so everyone can see the restricted zone.
- Late joiners after the sequence begins still deploy in order but do not reset or reorder assignments; they must participate in the current task upon landing.
- Presenter view must display a live timer for the active assignment as soon as the first task starts so the audience can track progress.
- When the sequence is complete, presenter and player beam views both reveal a report listing each assignment with its duration plus the total time so the team can review their performance.

## Data Requirements
- **Global Store**: controllerConnectionId, started flag, startTimestamp, deploymentInterval, physicsSpeed, players registry `{clientId: {name, weight, status, position, deployedAt}}`, deploymentQueue array (clientIds), beam state `{angle, velocity, lastUpdate}`.
- **Player Store**: local name, weight, currentView (lobby/countdown/beam), personal countdown metadata (target timestamp), local control state (desired direction input).
- **Actions**:
  - `playerActions.setPlayerProfile(name, weight)` updates local/global data and queue.
  - `globalActions.setDeploymentInterval(value)` for host.
  - `globalActions.setPhysicsSpeed(multiplier)` for host.
  - `globalActions.scheduleNextDeployment()` to move next queued player to deployed state (used by controller tick).
  - `globalActions.updateBeamPhysics(deltaTime)` runs regularly using server timer, applying multiplier.
  - `playerActions.movePlayer(direction)` to request left/right adjustments.

## UI Requirements
- **Host View**: Shows numeric inputs/sliders for deployment interval and physics speed, plus plain text values for current next player, total deployed, and countdown.
- **Presenter View**: Renders beam visualization, shows `nextPlayerName`, timer until drop, deployed counter, and game timer.
- **Player View**:
  - Lobby: profile form.
  - Lobby weight control uses a slider constrained to 25–125 kg with 5 kg steps so mobile users can drag rather than type.
  - Countdown: card with "You drop in Xs" plus beam preview of just themselves until deployment.
  - Beam: live beam component with controls (buttons or gestures) to move left/right, plus indicator of beam tilt. The player beam should always display that player's weight next to their name so they can verify the profile entry.
- **Circular visualization**: Presenter and player beam views must render a full circular dial with major/minor angle markers (e.g., every 30°) so spectators can see complete rotations without overlapping surrounding text. The dial should contain the beam bar, rotation ticks, and labels within a fixed square area so adjacent copy remains readable.

## Constraints & Notes
- Use Kokimoki SDK state stores and actions; no inline transactions in components.
- Continue to respect existing instructions (no edits in `src/kit/`).
- Ensure all user-facing copy configurable via `config` (schema + YAML).
- Deployment proceeds even if player disconnected; on reconnect they regain control while avatar remains.
- All timers use `useServerTimer` for synced timestamps.
