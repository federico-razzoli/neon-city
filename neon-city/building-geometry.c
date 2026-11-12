/* SPDX-License-Identifier: AGPL-3.0-only */
/* Static wall panels, with the same interpolation order as the JS renderer.
 * Each vertex contains x, y, z, u, v; v is normalized to texture height.
 */
#include "geometry.h"
#define panels geometry_output
__attribute__((export_name("building_build")))
void building_build(double x, double z, double w, double d, double h) {
  double ends[4][4] = {
    {x, z, x+w, z}, {x+w, z+d, x, z+d},
    {x, z+d, x, z}, {x+w, z, x+w, z+d}
  };
  for (int side = 0; side < 4; side++) {
    double *e = ends[side];
    for (int s = 0; s < 8; s++) for (int v = 0; v < 4; v++) {
      double t = (v == 1 || v == 2) ? (s+1)/8.0 : s/8.0;
      double *p = panels + ((side*8+s)*4+v)*5;
      p[0] = e[0] + (e[2]-e[0])*t;
      p[1] = v < 2 ? 0 : h;
      p[2] = e[1] + (e[3]-e[1])*t;
      p[3] = t*160;
      p[4] = v < 2 ? 1 : 0;
    }
  }
}
