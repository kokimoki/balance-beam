import { z } from 'zod/v4';

export const schema = z.object({
	// translations
	title: z.string().default('My Game'),

	gameLobbyMd: z
		.string()
		.default(
			'# Waiting for game to start...\nThe game will start once the host presses the start button.'
		),
	connectionsMd: z.string().default('# Connections example'),
	sharedStateMd: z.string().default('# Shared State example'),

	players: z.string().default('Players'),
	timeElapsed: z.string().default('Time elapsed'),
	startButton: z.string().default('Start Game'),
	stopButton: z.string().default('Stop Game'),
	loading: z.string().default('Loading...'),

	menuTitle: z.string().default('Menu'),
	menuConnections: z.string().default('Connections'),
	menuGameLobby: z.string().default('Lobby'),

	playerNameTitle: z.string().default('Enter Your Name'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Continue'),

	playerWeightTitle: z.string().default('Enter Your Weight'),
	playerWeightPlaceholder: z.string().default('Weight in kg...'),
	playerWeightLabel: z.string().default('Weight:'),
	playerCountdownTitle: z.string().default('You are about to drop'),
	playerCountdownDescriptionMd: z
		.string()
		.default(
			'# Deployment countdown\nWatch the timer to know when you will drop onto the beam.'
		),
	playerQueuePositionLabel: z.string().default('Queue position'),
	playerWaitingForHostLabel: z
		.string()
		.default('Waiting for the host to start'),
	playerBeamActiveHint: z
		.string()
		.default('Tilt is shared by everyone - keep it balanced!'),
	playerBeamStableLabel: z.string().default('Beam stable'),
	playerStableThresholdDegrees: z.number().default(15),
	playerBeamLockedHint: z
		.string()
		.default('You will gain control once deployed.'),
	playerCurrentPositionLabel: z
		.string()
		.default('Current position'),
	balanceWarningAngle: z.number().default(12),
	balanceWarningTitle: z.string().default('Beam unstable'),
	balanceWarningDescription: z
		.string()
		.default('The beam is tilting too far. Spread out to regain balance.'),

	hostControlsTitle: z.string().default('Balance Controls'),
	hostDeploymentIntervalLabel: z
		.string()
		.default('Deployment interval (seconds)'),
	hostPhysicsSpeedLabel: z
		.string()
		.default('Physics speed multiplier'),
	hostNextPlayerLabel: z.string().default('Next player'),
	hostNextDropLabel: z.string().default('Next drop in'),
	hostTotalDeployedLabel: z.string().default('Players deployed'),
	noQueuedPlayerLabel: z.string().default('No player queued'),

	presenterNextDropLabel: z.string().default('Next drop in'),
	presenterNextPlayerLabel: z.string().default('Next player'),
	presenterDeployedLabel: z.string().default('Deployed players'),

	playerBeamTitle: z.string().default('Balance Beam'),
	playerMoveLeftLabel: z.string().default('Move left'),
	playerMoveRightLabel: z.string().default('Move right'),

	hostLabel: z.string().default('Host'),
	presenterLabel: z.string().default('Presenter'),

	gameLinksTitle: z.string().default('Game Links'),
	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Link'),

	menuAriaLabel: z.string().default('Open menu drawer'),

	assignmentsTitle: z.string().default('Team Assignments'),
	assignmentsWaitingForDeploymentLabel: z
		.string()
		.default('Assignments begin once everyone is on the beam.'),
	assignmentNoActiveLabel: z.string().default('Assignments complete'),
	assignmentCurrentTaskLabel: z.string().default('Current Assignment'),
	assignmentStatusLockedLabel: z.string().default('Locked'),
	assignmentStatusActiveLabel: z.string().default('Active'),
	assignmentStatusCompletedLabel: z.string().default('Completed'),
	assignmentDurationLabel: z.string().default('Duration'),
	assignmentHoldHint: z
		.string()
		.default('Hold steady within +/-{degrees} degrees for {seconds}s.'),
	assignmentBalanceToleranceDegrees: z.number().default(5),
	assignmentBalanceHoldSeconds: z.number().default(10),
	assignmentCenterZoneLabel: z.string().default('Center third'),

	assignmentBalanceTitle: z.string().default('Balance the beam'),
	assignmentBalanceDescriptionMd: z
		.string()
		.default('# Stabilize the beam\nHold the beam near zero for at least 10 seconds.'),
	assignmentSpreadTitle: z
		.string()
		.default('Clear the center third'),
	assignmentSpreadDescriptionMd: z
		.string()
		.default(
			"# Move everyone outward\nEach player must leave the center third of the beam, then balance together."
		),
	assignmentSwapTitle: z.string().default('Switch sides'),
	assignmentSwapDescriptionMd: z
		.string()
		.default(
			"# Swap positions\nEvery player crosses to the opposite side, then balance the beam."
		),
	assignmentTurn360Title: z.string().default('Full rotation'),
	assignmentTurn360DescriptionMd: z
		.string()
		.default(
			"# 360° spin\nRotate the beam one full turn in any direction, then stabilize at zero."
		),
	assignmentTouch90Title: z.string().default('Touch the bottom'),
	assignmentTouch90DescriptionMd: z
		.string()
		.default(
			"# Hit 90°\nTilt to at least 90° once, then return to balance for 10 seconds."
		),
	assignmentTurn720Title: z.string().default('Double rotation'),
	assignmentTurn720DescriptionMd: z
		.string()
		.default(
			"# Two complete turns\\nSpin the beam twice before leveling out together."
		),
});

export type Config = z.infer<typeof schema>;
