import numpy as np
import matplotlib.pyplot as plt

#range for both angles A and B
a = np.linspace(-6.28,6.28,120)
b = np.linspace(-6.28,6.28, 120)
A, B = np.meshgrid(a, b)

#--Equations--#
#f_AB = np.sin(A + B)
#f_AB = np.cos(A + B)
#f_AB = np.tan(A + B)
#f_AB = np.sin(A)*np.sin(B)
f_AB = np.sin(np.sqrt(A*A + B*B))


#plotting the surfaces
ax = plt.figure(figsize=(10, 8)).add_subplot(projection="3d")
ax.plot_surface(A, B, f_AB)

ax.set_xlabel("A")
ax.set_ylabel("B")
ax.set_zlabel("f(A, B)")

plt.show()
