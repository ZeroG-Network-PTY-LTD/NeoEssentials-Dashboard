<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown specifically when the mod's API couldn't be reached at all (connection
 * refused/timed out) or rejected our paired key — as opposed to a normal
 * RuntimeException for the mod being reachable but rejecting the request on its
 * own terms (e.g. "player not online", "unsafe_location"). Controllers use this
 * distinction to report an actual gateway failure (502) separately from an
 * ordinary request rejection (422) — see InteractsWithMinecraftApi::attemptJson().
 */
class MinecraftApiUnreachableException extends RuntimeException
{
}
