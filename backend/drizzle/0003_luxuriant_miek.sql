CREATE TABLE `refresh_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_id` integer NOT NULL,
	`trigger` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`outcome` text NOT NULL,
	`coverage_status` text NOT NULL,
	`freshness_status` text NOT NULL,
	`unavailable_signals` text NOT NULL,
	`stale_signals` text NOT NULL,
	`signal_results` text NOT NULL,
	`served_from_cache` integer DEFAULT false NOT NULL,
	`coalesced_to_attempt_id` integer,
	`error_type` text,
	`error_message` text,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `refresh_attempts_location_started_idx` ON `refresh_attempts` (`location_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `refresh_attempts_completed_idx` ON `refresh_attempts` (`completed_at`);--> statement-breakpoint
CREATE TABLE `weather_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_id` integer NOT NULL,
	`refresh_attempt_id` integer NOT NULL,
	`captured_at` text NOT NULL,
	`observed_at` text,
	`condition` text,
	`source` text,
	`area` text,
	`valid_period_text` text,
	`temperature_c` real,
	`humidity_percent` real,
	`rainfall_mm` real,
	`wind_speed_knots` real,
	`wind_direction_degrees` real,
	`forecast_low_c` real,
	`forecast_high_c` real,
	`uv_index` real,
	`psi_twenty_four_hourly` real,
	`pm25_one_hourly` real,
	`air_quality_region` text,
	`forecast_periods` text NOT NULL,
	`daily_forecast` text NOT NULL,
	`data_quality` text NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`refresh_attempt_id`) REFERENCES `refresh_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `weather_observations_location_captured_idx` ON `weather_observations` (`location_id`,`captured_at`);--> statement-breakpoint
CREATE INDEX `weather_observations_observed_idx` ON `weather_observations` (`observed_at`);
