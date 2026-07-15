import matplotlib.pyplot as plt

# Data for the accuracy evaluation (based on 100 test queries)
labels = [
    'Complete Success\n(Correct Tool & Parameters)', 
    'Partial Success\n(Correct Tool, Missing Parameter)', 
    'Failure\n(Hallucination / Wrong Tool)'
]
sizes = [85, 10, 5]

# Professional academic color palette (Green, Orange, Red)
colors = ['#2ecc71', '#f39c12', '#e74c3c']

# Explode the 'Failure' slice slightly to emphasize the low error rate
explode = (0, 0, 0.15)  

plt.figure(figsize=(8, 8))

# Create the pie chart
plt.pie(sizes, explode=explode, labels=labels, colors=colors, autopct='%1.1f%%',
        shadow=False, startangle=140, textprops={'fontsize': 11, 'fontweight': 'bold'})

# Add the caption/title
plt.title('Figure 4.4: Accuracy of the MCP agent in resolving \nuser intents into structured tool calls.', 
          fontsize=14, fontweight='bold', pad=20)

# Equal aspect ratio ensures that pie is drawn as a circle.
plt.axis('equal')  

# Save and show the figure
plt.tight_layout()
plt.savefig('Figure_4_4_MCP_Accuracy.png', dpi=300)
plt.show()