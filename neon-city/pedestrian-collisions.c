/* SPDX-License-Identifier: AGPL-3.0-only
 * Batched pedestrian broad phase and queue collision resolution.
 * Keep pair order and double arithmetic consistent with the JavaScript rules.
 */
#define MAX_PEOPLE 512
#define WORDS ((MAX_PEOPLE + 31) / 32)
#define HASH_SIZE 4096
#define MAX_NODES 16384
static double source[MAX_PEOPLE * 4]; /* before x,z; planned x,z */
static unsigned char initial[MAX_PEOPLE], blocked[MAX_PEOPLE];
static unsigned int pairs[MAX_PEOPLE][WORDS];
static int cell_x[HASH_SIZE], cell_z[HASH_SIZE], head[HASH_SIZE];
static unsigned int stamp[HASH_SIZE], generation;
static int walker[MAX_NODES], next[MAX_NODES];
__attribute__((export_name("input"))) double *input_buffer(void) { return source; }
__attribute__((export_name("initial"))) unsigned char *initial_buffer(void) { return initial; }
__attribute__((export_name("output"))) unsigned char *output_buffer(void) { return blocked; }
__attribute__((export_name("capacity"))) int capacity(void) { return MAX_PEOPLE; }
static double min(double a, double b) { return a < b ? a : b; }
static double max(double a, double b) { return a > b ? a : b; }

/* Return 0 without publishing results if fixed storage cannot represent this
 * step, or if a distance is too close to the boundary to replace JS Math.hypot
 * with a squared-distance comparison. The caller retains the JS resolver.
 */
__attribute__((export_name("resolve")))
int resolve(int count, double clearance) {
  if (count < 0 || count > MAX_PEOPLE || !(clearance > 0) || clearance > 16) return 0;
  if (++generation == 0) {
    for (int h = 0; h < HASH_SIZE; h++) stamp[h] = 0;
    generation = 1;
  }
  int nodes = 0, cells = 0;
  for (int i = 0; i < count; i++) {
    blocked[i] = initial[i];
    for (int w = 0; w < WORDS; w++) pairs[i][w] = 0;
  }
  for (int i = 0; i < count; i++) {
    double *p = source + i * 4;
    for (int k = 0; k < 4; k++) if (!(p[k] >= -1e8 && p[k] <= 1e8)) return 0;
    int x0 = (int)__builtin_floor((min(p[0], p[2]) - clearance) / 4);
    int x1 = (int)__builtin_floor((max(p[0], p[2]) + clearance) / 4);
    int z0 = (int)__builtin_floor((min(p[1], p[3]) - clearance) / 4);
    int z1 = (int)__builtin_floor((max(p[1], p[3]) + clearance) / 4);
    /* Check bounds before multiplying, including exceptionally long steps. */
    int width = x1 - x0 + 1, height = z1 - z0 + 1;
    if (width > MAX_NODES || height > MAX_NODES || width * height > MAX_NODES - nodes) return 0;
    for (int x = x0; x <= x1; x++) for (int z = z0; z <= z1; z++) {
      unsigned int h = ((unsigned int)x * 1597334677u ^ (unsigned int)z * 3812015801u) & (HASH_SIZE - 1);
      while (stamp[h] == generation && (cell_x[h] != x || cell_z[h] != z)) h = (h + 1) & (HASH_SIZE - 1);
      if (stamp[h] != generation) {
        if (++cells > HASH_SIZE / 2) return 0;
        stamp[h] = generation; cell_x[h] = x; cell_z[h] = z; head[h] = -1;
      }
      for (int n = head[h]; n >= 0; n = next[n]) {
        int j = walker[n];
        pairs[j][i / 32] |= 1u << (i % 32);
      }
      walker[nodes] = i; next[nodes] = head[h]; head[h] = nodes++;
    }
  }
  int changed = 1;
  while (changed) {
    changed = 0;
    for (int i = 0; i < count; i++) for (int w = 0; w < WORDS; w++) {
      unsigned int bits = pairs[i][w];
      while (bits) {
        int j = w * 32 + __builtin_ctz(bits); bits &= bits - 1;
        double *a = source + i * 4, *b = source + j * 4;
        double x = a[0] - b[0], z = a[1] - b[1];
        double end_x = a[blocked[i] ? 0 : 2] - b[blocked[j] ? 0 : 2];
        double end_z = a[blocked[i] ? 1 : 3] - b[blocked[j] ? 1 : 3];
        double dx = end_x - x, dz = end_z - z, length = dx * dx + dz * dz;
        double t = length ? max(0, min(1, ((-x) * dx + (-z) * dz) / length)) : 0;
        double near_x = x + dx * t, near_z = z + dz * t;
        double distance2 = near_x * near_x + near_z * near_z, limit2 = clearance * clearance;
        if (__builtin_fabs(distance2 - limit2) <= 1e-12) return 0;
        if (distance2 >= limit2) continue;
        double ax = a[2] - a[0], az = a[3] - a[1], bx = b[2] - b[0], bz = b[3] - b[1];
        int stop_a = 1, stop_b = 1;
        if (ax * bx + az * bz > 0) {
          int a_behind = (b[0] - a[0]) * (ax + bx) + (b[1] - a[1]) * (az + bz) > 0;
          stop_a = a_behind; stop_b = !a_behind;
        }
        if (stop_a && !blocked[i]) { blocked[i] = 1; changed = 1; }
        if (stop_b && !blocked[j]) { blocked[j] = 1; changed = 1; }
      }
    }
  }
  return 1;
}
