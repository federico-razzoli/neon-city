/* SPDX-License-Identifier: AGPL-3.0-only
 * Perspective-correct wall column projection.
 * No fast-math or floating-point contraction: signs and panel edges must match.
 */
static double input[32 * 5];
static double output[8192 * 9];
__attribute__((export_name("input"))) double *input_buffer(void) { return input; }
__attribute__((export_name("output"))) double *output_buffer(void) { return output; }
static double min(double a, double b) { return a < b ? a : b; }
static double max(double a, double b) { return a > b ? a : b; }
// Recover attributes only for the selected extreme intersections.
static inline __attribute__((always_inline)) void attributes(double *out, double *a, double *b, double t, double y) {
  double inverse = (1 - t) / a[2] + t / b[2];
  out[0] = y;
  out[1] = 1 / inverse;
  out[2] = ((1 - t) * a[3] / a[2] + t * b[3] / b[2]) / inverse;
  out[3] = ((1 - t) * a[4] / a[2] + t * b[4] / b[2]) / inverse;
}
__attribute__((export_name("columns")))
int columns(int count, int width) {
  double left = input[0], right = input[0];
  for (int i = 1; i < count; i++) {
    left = min(left, input[i * 5]); right = max(right, input[i * 5]);
  }
  if (right <= .5 || left >= width + .5) return 0;
  int start = (int)max(0, __builtin_ceil(left - .5));
  int end = (int)min(width, __builtin_ceil(right - .5));
  int n = 0;
  for (int x = start; x < end; x++) {
    double center = x + .5, topY = 0, bottomY = 0, topT = 0, bottomT = 0;
    int nh = 0;
    double *topA = input, *topB = input, *bottomA = input, *bottomB = input;
    for (int i = 0; i < count; i++) {
      int j = (i + 1) % count;
      double *a = input + i * 5, *b = input + j * 5;
      if (center < min(a[0], b[0]) || center >= max(a[0], b[0])) continue;
      double t = (center - a[0]) / (b[0] - a[0]);
      double y = a[1] + (b[1] - a[1]) * t;
      // Preserve the first minimum and last maximum, including tied vertices.
      if (nh++ == 0) {
        topY = bottomY = y; topT = bottomT = t;
        topA = bottomA = a; topB = bottomB = b;
      } else {
        if (y < topY) { topY = y; topT = t; topA = a; topB = b; }
        if (y >= bottomY) { bottomY = y; bottomT = t; bottomA = a; bottomB = b; }
      }
    }
    if (nh < 2) continue;
    double *o = output + n++ * 9; o[0] = x;
    attributes(o + 1, topA, topB, topT, topY);
    attributes(o + 5, bottomA, bottomB, bottomT, bottomY);
  }
  return n;
}
