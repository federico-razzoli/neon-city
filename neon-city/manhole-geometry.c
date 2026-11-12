/* SPDX-License-Identifier: AGPL-3.0-only */
/* Unit circle sampled with the original JS expression i*Math.PI/8.
 * Preserve even the tiny axis offsets to keep the existing geometry exact.
 */
static const double directions[16][2] = {
  {1, 0},
  {0.9238795325112867, 0.3826834323650898},
  {0.7071067811865476, 0.7071067811865475},
  {0.38268343236508984, 0.9238795325112867},
  {6.123233995736766e-17, 1},
  {-0.3826834323650897, 0.9238795325112867},
  {-0.7071067811865475, 0.7071067811865476},
  {-0.9238795325112867, 0.3826834323650899},
  {-1, 1.2246467991473532e-16},
  {-0.9238795325112868, -0.3826834323650896},
  {-0.7071067811865477, -0.7071067811865475},
  {-0.38268343236509034, -0.9238795325112865},
  {-1.8369701987210297e-16, -1},
  {0.38268343236509, -0.9238795325112866},
  {0.7071067811865474, -0.7071067811865477},
  {0.9238795325112865, -0.3826834323650904}
};
/* Three disks of 16 x/z pairs, followed by three groove lengths. */
#include "geometry.h"
#define geometry geometry_output
__attribute__((export_name("manhole_build")))
void manhole_build(double radius) {
  double radii[3] = {radius, radius-.08, radius-.14};
  for (int disk = 0; disk < 3; disk++) for (int i = 0; i < 16; i++) {
    int k = disk*32+i*2;
    geometry[k] = directions[i][0]*radii[disk];
    geometry[k+1] = directions[i][1]*radii[disk];
  }
  double inner = radius-.2;
  for (int i = 0; i < 3; i++) {
    double offset = (i-1)*.25;
    geometry[96+i] = 2*__builtin_sqrt(inner*inner-offset*offset);
  }
}
