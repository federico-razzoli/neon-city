/* SPDX-License-Identifier: AGPL-3.0-only */
/* Largest generator: up to 256 car faces * 24 values per face.
 * Generators run synchronously; callers copy results before the next call.
 */
extern double geometry_output[256*24];
